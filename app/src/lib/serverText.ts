import { t } from '@/i18n/core';
import type { Key } from '@/i18n/dict';

// The line the server raised, in the person's language (i18n/parts/server.ts).
// Each pattern is the English text as raise exception wrote it; the first match
// wins, an unknown message comes back as it was, lower-cased. Screens that have
// their own code tables (check-in, comments, auth) fall back to this one.
const known: [RegExp, Key][] = [
  [/^sign in first$|^signedout$/i, 'err.signin'],
  [/make an account first|sign up (first|to write)/i, 'err.account'],
  [/this account is closed/i, 'err.closed'],
  [/sign in again first/i, 'err.signin.again'],
  [/that was another account/i, 'err.other.account'],
  [/accept the terms first/i, 'err.terms'],
  [/those terms do not exist yet/i, 'err.terms.future'],
  [/^nonight$|no such night/i, 'err.nonight'],
  [/that night is over/i, 'err.over'],
  [/that time has passed/i, 'err.passed'],
  [/those days are over/i, 'err.days.over'],
  [/unknown city/i, 'err.city'],
  [/unknown kind|which kind\?/i, 'err.kind'],
  [/unknown colour/i, 'err.colour'],
  [/^admin only|admins? only/i, 'err.admin'],
  [/staff only|the team only/i, 'err.staff'],
  [/the last admin stays an admin/i, 'err.last.admin'],
  [/^not yours$|not your file/i, 'err.not.yours'],
  [/only the owner|only the admin or whoever made it/i, 'err.owner'],
  [/no such person/i, 'err.no.person'],
  [/no such post/i, 'err.no.post'],
  [/no such dj/i, 'err.no.dj'],
  [/no such conversation/i, 'err.no.chat'],
  [/not yourself/i, 'err.not.self'],
  [/^frozen$/i, 'err.frozen'],
  [/^far$/i, 'err.far'],
  [/^notnow$/i, 'err.notnow'],
  [/^notthere$/i, 'err.notthere'],
  [/^toolate$/i, 'err.toolate'],
  [/^time: HH:MM/i, 'err.time'],
  [/^date: YYYY-MM-DD/i, 'err.date'],
  [/the last day comes after the first/i, 'err.days.order'],
  [/photo link: https/i, 'err.link.photo'],
  [/ticket link: https/i, 'err.link.ticket'],
  [/title: 2 to 120/i, 'err.title.len'],
  [/text: at most 2000/i, 'err.text.len'],
  [/^one emoji$/i, 'err.emoji'],
  [/only friends can be added/i, 'err.friends.only'],
  [/that room is not in this city/i, 'err.room.city'],
  [/only nights made here/i, 'err.made.here'],
  [/already sent/i, 'err.already'],
  [/^taken$|name is taken/i, 'err.handle.taken'],
  [/blocked|cannot reach/i, 'err.blocked'],
  [/nothing waiting with that id/i, 'err.nothing.waiting'],
  [/not a guest/i, 'err.not.guest'],
  [/too many|enough for today/i, 'err.too.many'],
  [/wrong password|invalid login credentials/i, 'err.wrong.password'],
];

export function serverText(e: unknown): string {
  const m = String((e as { message?: string })?.message ?? e ?? '').trim();
  const hit = known.find(([re]) => re.test(m));
  return hit ? t(hit[1]) : m.toLowerCase();
}
