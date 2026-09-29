import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlaylist } from 'expo-audio';
import Storage from 'expo-sqlite/kv-store';
import { genres, tracks, type Genre } from '@/content/music';

const KEY = 'ambient.on';
const KEY_GENRE = 'ambient.genre';
const VOLUME = 0.7;
const FADE_MS = 600;
const STEP_MS = 40;

type Ambient = {
  on: boolean;
  toggle: () => void;
  genre: Genre;
  setGenre: (g: Genre) => void;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  // Something else is playing (a DJ clip): fade out without changing the preference.
  hush: (quiet: boolean) => void;
};
const Ctx = createContext<Ambient>({
  on: false,
  toggle: () => {},
  genre: 'house',
  setGenre: () => {},
  pickerOpen: false,
  openPicker: () => {},
  closePicker: () => {},
  hush: () => {},
});

const isGenre = (v: string | null): v is Genre => genres.some((g) => g.id === v);

// Background music. Lives at the root so it survives navigation.
// Off by default; the preference and genre persist on the device; soft fades; pauses in the background.
export function AmbientProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState<boolean>(() => Storage.getItemSync(KEY) === '1');
  const [genre, setGenreState] = useState<Genre>(() => {
    const v = Storage.getItemSync(KEY_GENRE);
    return isGenre(v) ? v : 'house';
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hushed, setHushed] = useState(false);
  // Until sound is turned on the engine gets an empty list, so nothing is fetched while off.
  const [armedOnce, setArmedOnce] = useState(false);
  const armed = on || armedOnce;

  useEffect(() => {
    // The user turned sound on themselves; do not let Android's vibrate mode silence it.
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
  }, []);

  const toggle = useCallback(() => {
    setArmedOnce(true);
    setOn((v) => {
      Storage.setItemSync(KEY, v ? '0' : '1');
      return !v;
    });
  }, []);

  const setGenre = useCallback((g: Genre) => {
    Storage.setItemSync(KEY_GENRE, g);
    setGenreState(g);
    setArmedOnce(true);
    setOn(() => {
      Storage.setItemSync(KEY, '1'); // picking a genre means they want to listen
      return true;
    });
  }, []);

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const hush = useCallback((quiet: boolean) => setHushed(quiet), []);

  return (
    <Ctx.Provider value={{ on, toggle, genre, setGenre, pickerOpen, openPicker, closePicker, hush }}>
      {/* A genre change remounts the engine: new playlist from scratch. */}
      <Engine key={genre} genre={genre} on={on && !hushed} armed={armed} />
      {children}
    </Ctx.Provider>
  );
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The player. Invisible; it only drives the playlist.
function Engine({ genre, on, armed }: { genre: Genre; on: boolean; armed: boolean }) {
  // A fresh order every launch (and every genre change), so it never opens on the same track.
  const [order] = useState(() => shuffle(tracks[genre]));
  const playlist = useAudioPlaylist({ sources: armed ? order : [], loop: 'all' });
  const p = useRef(playlist);
  useEffect(() => {
    p.current = playlist;
  }, [playlist]);

  // play() is silent until tracks load, so wait for loading first.
  const [loaded, setLoaded] = useState(() => playlist.isLoaded);
  useEffect(() => {
    const sub = playlist.addListener('playlistStatusUpdate', (status) => {
      if (status.isLoaded) setLoaded(true);
    });
    // Already loaded before the listener attached: check on the next tick.
    const t = setTimeout(() => {
      if (playlist.isLoaded) setLoaded(true);
    }, 0);
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [playlist]);

  const fade = useRef<ReturnType<typeof setInterval> | null>(null);
  // When the engine unmounts (genre change), stop the timer and leave the released player alone.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true; // revive after a remount (fast refresh)
    return () => {
      alive.current = false;
      if (fade.current) clearInterval(fade.current);
      fade.current = null;
    };
  }, []);
  // Touching a released native object throws; swallow it.
  const safe = (fn: () => void) => {
    if (!alive.current) return;
    try {
      fn();
    } catch {
      /* player already released */
    }
  };

  const fadeTo = useCallback((target: number, then?: () => void) => {
    if (fade.current) clearInterval(fade.current);
    if (!alive.current) return;
    const steps = Math.max(1, Math.round(FADE_MS / STEP_MS));
    let from = 0;
    safe(() => {
      from = p.current.volume;
    });
    let i = 0;
    fade.current = setInterval(() => {
      i += 1;
      safe(() => {
        p.current.volume = from + ((target - from) * i) / steps;
      });
      if (i >= steps || !alive.current) {
        if (fade.current) clearInterval(fade.current);
        fade.current = null;
        if (alive.current) then?.();
      }
    }, STEP_MS);
  }, []);

  const start = useCallback(() => {
    safe(() => {
      if (!p.current.playing) {
        p.current.volume = 0;
        p.current.play();
      }
    });
    fadeTo(VOLUME);
  }, [fadeTo]);
  const stop = useCallback(() => fadeTo(0, () => safe(() => p.current.pause())), [fadeTo]);

  useEffect(() => {
    if (!loaded) return;
    if (on) start();
    else stop();
  }, [on, loaded, start, stop]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      // Background only: on iOS 'inactive' also fires for permission prompts and the notification shade.
      if (state === 'active') {
        if (on) start();
      } else if (state === 'background') {
        safe(() => p.current.pause());
      }
    });
    return () => sub.remove();
  }, [on, start]);

  return null;
}

export function useAmbient() {
  return useContext(Ctx);
}
