import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';
import { supabase } from '@/lib/supabase';
import { must } from '@/lib/offline';

// 51_safety.sql: what the stores require — the terms (18+), reports, client errors —
// and an account deletion that takes the files and the Apple link with it.

// ------------------------------------------------------------------ the terms

// Raise this when the terms change: everyone is asked again.
export const TERMS_VERSION = 1;
const SITE = 'https://kurtkurtkurt-del.github.io/afterhours';
export const TERMS_URL = `${SITE}/agb/`;
export const PRIVACY_URL = `${SITE}/datenschutz/`;

// Remembered per account on the phone, so an offline start does not ask again.
const accepted = (uid: string) => `terms.${uid}`;
export function termsKnown(uid: string): boolean {
  try {
    return Number(Storage.getItemSync(accepted(uid)) ?? 0) >= TERMS_VERSION;
  } catch {
    return false;
  }
}
// true: accepted the current terms · false: must be asked · null: could not tell (offline)
export async function termsAccepted(uid: string): Promise<boolean | null> {
  if (termsKnown(uid)) return true;
  const { data, error } = await supabase.rpc('terms_status');
  if (error) return null;
  const row = ((data ?? []) as { version: number | null; adult: boolean }[])[0];
  const ok = !!row && row.adult && (row.version ?? 0) >= TERMS_VERSION;
  if (ok) Storage.setItemSync(accepted(uid), String(row.version));
  return ok;
}
export async function acceptTerms(uid: string) {
  await must(supabase.rpc('accept_terms', { p_version: TERMS_VERSION, p_adult: true }));
  Storage.setItemSync(accepted(uid), String(TERMS_VERSION));
}

// 52_bans.sql: a closed account is told so, with the reason. null: could not tell.
export async function accountStatus(): Promise<{ banned: boolean; reason: string | null } | null> {
  const { data, error } = await supabase.rpc('account_status');
  if (error) return null;
  const row = ((data ?? []) as { banned: boolean; reason: string | null }[])[0];
  return row ? { banned: row.banned, reason: row.reason } : null;
}

// 53_trust.sql: what the staff did to your things, told once.
export type Notice = { id: number; kind: 'comment_hidden' | 'post_hidden' | 'removed' | 'profile_cleared' | 'role' | 'dj_verified' | 'dj_hidden'; data: Record<string, string>; created_at: string };
export async function myNotices(): Promise<Notice[]> {
  const { data, error } = await supabase.rpc('my_notices');
  if (error) return [];
  return (data ?? []) as Notice[];
}
export async function noticesSeen() {
  await must(supabase.rpc('notices_seen'));
}

// The sign-in itself: a new email is confirmed from both addresses' inboxes
// (Supabase sends the links); a new password works at once.
const CONFIRM_URL = `${SITE}/login/`;
export async function changeEmail(email: string) {
  const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: CONFIRM_URL });
  if (error) throw error;
}
export async function changePassword(password: string) {
  if (password.length < 8) throw new Error('at least 8 characters');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// Which numbered SQL files never reached the live database (00_migrations.sql stamps them).
export async function missingSql(): Promise<string[] | null> {
  const { EXPECTED_SQL } = await import('@/data/expectedSql');
  const { data, error } = await supabase.rpc('migrations_applied');
  if (error) return null;
  const have = new Set(((data ?? []) as { name: string }[]).map((r) => r.name));
  return EXPECTED_SQL.filter((n) => !have.has(n));
}

// ------------------------------------------------------------------ reports

// Posts keep their own (data/posts.ts postReport); everything else comes here.
export type ReportKind = 'comment' | 'room_post' | 'group_message' | 'profile' | 'group' | 'spark' | 'post_comment';
export async function report(kind: ReportKind, target: string, reason: string | null) {
  await must(supabase.rpc('report', { p_kind: kind, p_target: target, p_reason: reason }));
}
export type OpenReport = { kind: ReportKind; target: string; preview: string | null; author: string | null; reports: number; reasons: string[]; first_at: string };
export async function staffReports(): Promise<OpenReport[]> {
  return ((await must(supabase.rpc('staff_reports'))) ?? []) as OpenReport[];
}
export async function settleReport(kind: ReportKind, target: string, remove: boolean) {
  await must(supabase.rpc('staff_report_settle', { p_kind: kind, p_target: target, p_remove: remove }));
}

// ------------------------------------------------------------------ client errors

let sent = 0;
// Fire and forget; at most twenty a session, so a render loop cannot flood it.
export function logError(e: unknown, where: string | null, fatal = false) {
  if (sent >= 20) return;
  sent += 1;
  const err = e instanceof Error ? e : new Error(String(e));
  supabase
    .rpc('log_error', {
      p_message: err.message,
      p_stack: err.stack ?? null,
      p_where: where,
      p_platform: Platform.OS,
      p_version: Constants.expoConfig?.version ?? null,
      p_fatal: fatal,
    })
    .then(
      () => {},
      () => {},
    );
}

// Every uncaught error goes to the table first, then on to React Native's own handler.
let installed = false;
export function catchErrors() {
  if (installed) return;
  installed = true;
  const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (fn: (e: unknown, fatal?: boolean) => void) => void } };
  const eu = g.ErrorUtils;
  if (!eu) return;
  const next = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    logError(e, 'global', !!fatal);
    next(e, fatal);
  });
}

export type ClientError = { id: number; message: string; stack: string | null; where_: string | null; platform: string | null; version: string | null; fatal: boolean; at: string; who: string | null };
export async function adminErrors(): Promise<ClientError[]> {
  return ((await must(supabase.rpc('admin_errors', { p_limit: 200 }))) ?? []) as ClientError[];
}
export async function clearErrors() {
  await must(supabase.rpc('admin_errors_clear'));
}

// ------------------------------------------------------------------ deleting the account

// Everything under your folder of the photos bucket: profile photo, posts, group
// covers and album photos. Storage cannot be emptied from SQL, so the app does it
// with your own rights (24_photos.sql: you see and remove your own folder).
async function removeFiles(uid: string) {
  const bucket = supabase.storage.from('photos');
  const walk = async (dir: string): Promise<string[]> => {
    const out: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(dir, { limit: 100, offset });
      if (error) throw error;
      for (const f of data ?? []) {
        // A folder has no id; a file does.
        if (f.id) out.push(`${dir}/${f.name}`);
        else out.push(...(await walk(`${dir}/${f.name}`)));
      }
      if (!data || data.length < 100) return out;
    }
  };
  const files = await walk(uid);
  for (let i = 0; i < files.length; i += 100) {
    const { error } = await bucket.remove(files.slice(i, i + 100));
    if (error) throw error;
  }
}

// App Store 5.1.1(v): an account made with Apple has its Apple link revoked when it is
// deleted. Apple asks once more (Face ID), the code goes to the apple-revoke function,
// which holds the key. false: the person cancelled (nothing is deleted).
async function revokeApple(): Promise<boolean> {
  try {
    const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
    if (credential.authorizationCode) {
      const { error } = await supabase.functions.invoke('apple-revoke', { body: { code: credential.authorizationCode } });
      if (error) logError(error, 'apple-revoke');
    }
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    logError(e, 'apple-revoke');
    return true;
  }
}

// true: deleted · false: cancelled at Apple's sheet
export async function deleteEverything(): Promise<boolean> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error('sign in first');
  const apple = Platform.OS === 'ios' && (user.identities ?? []).some((i) => i.provider === 'apple');
  if (apple && !(await revokeApple())) return false;
  await removeFiles(user.id);
  await must(supabase.rpc('delete_account'));
  return true;
}
