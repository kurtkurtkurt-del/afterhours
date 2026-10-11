import Storage from 'expo-sqlite/kv-store';
import { myCards, type CardRow } from '@/data/checkin';
import { groupThread, myGroups, type GroupRow, type Line } from '@/data/groups';
import { dmList, type DmThread } from '@/data/dms';

// Messages (11.10.2026): the rooms, the group chats and the direct messages in one list, with what is new.
// What you have seen is kept on the phone (kv-store), not on the server: a room's line
// count and a group chat's last line id, written when the room or the chat is open.
const roomKey = (slug: string) => `ah.seen.room.${slug}`;
const groupKey = (id: string) => `ah.seen.group.${id}`;
const dmKey = (id: string) => `ah.seen.dm.${id}`;
const num = (v: string | null) => (v ? Number(v) || 0 : 0);
const read = (key: string) => {
  try {
    return num(Storage.getItemSync(key));
  } catch {
    return 0;
  }
};
const write = (key: string, n: number) => {
  try {
    Storage.setItemSync(key, String(n));
  } catch {}
};
export const markRoomSeen = (slug: string, lines: number) => write(roomKey(slug), lines);
export const markGroupSeen = (id: string, lastLine: number) => write(groupKey(id), lastLine);
export const markDmSeen = (id: string, lastLine: number) => write(dmKey(id), lastLine);

export type GroupChat = { g: GroupRow; last: Line | null; unread: number };
export type Dm = DmThread & { unread: number };
export type Inbox = { rooms: CardRow[]; groups: GroupChat[]; dms: Dm[]; unread: number };

const left = (iso: string) => new Date(iso).getTime() - Date.now() > 0;
export const roomUnread = (c: CardRow) => (!c.frozen && left(c.freeze_at) ? Math.max(0, c.post_count - read(roomKey(c.slug))) : 0);

// Everything the messages page shows, and the number on the button: the open rooms' new
// lines and, in each living group, the lines after the last one you saw that are not yours.
export async function inbox(): Promise<Inbox> {
  const [rooms, groups, threads] = await Promise.all([
    myCards().catch(() => [] as CardRow[]),
    myGroups().catch(() => [] as GroupRow[]),
    dmList().catch(() => [] as DmThread[]),
  ]);
  // a direct thread: one unread when its last line is not mine and newer than what I saw
  const dms: Dm[] = threads.map((t) => ({ ...t, unread: t.last_id && !t.last_mine && t.last_id > read(dmKey(t.id)) ? 1 : 0 }));
  const chats = await Promise.all(
    groups
      .filter((g) => !g.archived)
      .map(async (g) => {
        const lines = await groupThread(g.id, 0).catch(() => [] as Line[]);
        const seen = read(groupKey(g.id));
        const last = lines[lines.length - 1] ?? null;
        return { g, last, unread: lines.filter((l) => l.id > seen && !l.mine).length };
      }),
  );
  const unread = rooms.reduce((n, c) => n + roomUnread(c), 0) + chats.reduce((n, c) => n + c.unread, 0) + dms.reduce((n, d) => n + d.unread, 0);
  return { rooms, groups: chats, dms, unread };
}
