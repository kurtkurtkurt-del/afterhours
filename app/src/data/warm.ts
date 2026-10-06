import { supabase } from '@/lib/supabase';
import { isOnline, onBackOnline } from '@/lib/offline';
import { prefetchImages } from '@/lib/images';
import { loadProfile } from '@/data/profile';
import { friendsLive, myCards } from '@/data/checkin';
import { friendsKept, friendsList, kept } from '@/data/friends';
import { friendPhotos } from '@/data/photo';
import { sparkInbox, sparkMine } from '@/data/sparks';
import { followedSlugs, loadDjs } from '@/data/djs';
import { fetchDeck } from '@/data/deck';
import { pastFeed } from '@/data/feed';
import { wavesKept } from '@/data/waves';
import { currentCity } from '@/data/here';

// Warm-up: when the app starts with an account and when the connection returns, the
// pages people open most are read in the background, so their shelves are full before
// the page is opened (it then shows at once, and offline too). The pictures on them go
// to the disk cache. At most once every two minutes.
let last = 0;
async function warm() {
  if (!isOnline() || Date.now() - last < 120_000) return;
  last = Date.now();
  // Every tab's first screen too, so none of them waits when it is opened: the flow's
  // deck, yours (its gallery sample, the feed, the waves) and the DJs.
  const city = currentCity() ?? 'munchen';
  const pages = Promise.allSettled([fetchDeck(city, null, 120), fetchDeck(city, null, 12), pastFeed(city, null, 10), wavesKept(), loadDjs()]);
  const [, , mine, theirs, , photos] = await Promise.allSettled([
    loadProfile(),
    myCards(),
    kept(),
    friendsKept(),
    friendsList(),
    friendPhotos(),
    friendsLive(),
    sparkInbox(),
    sparkMine(),
    followedSlugs(),
  ]);
  const urls: (string | null)[] = [];
  if (mine.status === 'fulfilled') urls.push(...mine.value.map((n) => n.image_url));
  if (theirs.status === 'fulfilled') urls.push(...theirs.value.slice(0, 20).map((k) => k.image_url));
  if (photos.status === 'fulfilled') urls.push(...photos.value.values());
  const [deck, , feed] = await pages;
  if (deck.status === 'fulfilled') urls.push(...deck.value.slice(0, 12).map((n) => n.image_url));
  if (feed.status === 'fulfilled') urls.push(...feed.value.map((p) => p.image_url));
  prefetchImages(urls);
}

let started = false;
export function startWarm() {
  if (started) return;
  started = true;
  supabase.auth.onAuthStateChange((event, session) => {
    // Guests have few shelves worth filling; accounts get the warm-up.
    if (session && !session.user.is_anonymous && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) setTimeout(() => warm().catch(() => {}), 1500);
  });
  onBackOnline(() => {
    last = 0;
    warm().catch(() => {});
  });
}
