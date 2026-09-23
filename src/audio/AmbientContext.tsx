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
};
const Ctx = createContext<Ambient>({
  on: false,
  toggle: () => {},
  genre: 'house',
  setGenre: () => {},
  pickerOpen: false,
  openPicker: () => {},
  closePicker: () => {},
});

const isGenre = (v: string | null): v is Genre => genres.some((g) => g.id === v);

// uygulamanın arka plan müziği. kökte yaşar, sayfa değişince kesilmez.
// varsayılan kapalı; tercih ve tür telefonda saklanır; yumuşak açılış/kapanış; arka planda durur.
export function AmbientProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState<boolean>(() => Storage.getItemSync(KEY) === '1');
  const [genre, setGenreState] = useState<Genre>(() => {
    const v = Storage.getItemSync(KEY_GENRE);
    return isGenre(v) ? v : 'house';
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    // kullanıcı sesi kendisi açıyor; android'de titreşim modu bile müziği susturmasın
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
  }, []);

  const toggle = useCallback(() => {
    setOn((v) => {
      Storage.setItemSync(KEY, v ? '0' : '1');
      return !v;
    });
  }, []);

  const setGenre = useCallback((g: Genre) => {
    Storage.setItemSync(KEY_GENRE, g);
    setGenreState(g);
    setOn(() => {
      Storage.setItemSync(KEY, '1'); // tür seçen dinlemek istiyor
      return true;
    });
  }, []);

  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  return (
    <Ctx.Provider value={{ on, toggle, genre, setGenre, pickerOpen, openPicker, closePicker }}>
      {/* tür değişince motor baştan kurulur: yeni liste, sıfırdan */}
      <Engine key={genre} genre={genre} on={on} />
      {children}
    </Ctx.Provider>
  );
}

// çalar. görünmez; sadece listeyi sürer.
function Engine({ genre, on }: { genre: Genre; on: boolean }) {
  const playlist = useAudioPlaylist({ sources: tracks[genre], loop: 'all' });
  const p = useRef(playlist);
  useEffect(() => {
    p.current = playlist;
  }, [playlist]);

  // parçalar yüklenmeden play() sessiz kalır; yüklenmeyi bekleyip öyle başlarız
  const [loaded, setLoaded] = useState(() => playlist.isLoaded);
  useEffect(() => {
    const sub = playlist.addListener('playlistStatusUpdate', (status) => {
      if (status.isLoaded) setLoaded(true);
    });
    return () => sub.remove();
  }, [playlist]);

  const fade = useRef<ReturnType<typeof setInterval> | null>(null);
  // motor kapanınca (tür değişti) zamanlayıcı da dursun; kapanmış çalara dokunmasın
  useEffect(
    () => () => {
      if (fade.current) clearInterval(fade.current);
      fade.current = null;
    },
    [],
  );
  const fadeTo = useCallback((target: number, then?: () => void) => {
    if (fade.current) clearInterval(fade.current);
    const steps = Math.max(1, Math.round(FADE_MS / STEP_MS));
    const from = p.current.volume;
    let i = 0;
    fade.current = setInterval(() => {
      i += 1;
      p.current.volume = from + ((target - from) * i) / steps;
      if (i >= steps) {
        if (fade.current) clearInterval(fade.current);
        fade.current = null;
        then?.();
      }
    }, STEP_MS);
  }, []);

  const start = useCallback(() => {
    if (!p.current.playing) {
      p.current.volume = 0;
      p.current.play();
    }
    fadeTo(VOLUME);
  }, [fadeTo]);
  const stop = useCallback(() => fadeTo(0, () => p.current.pause()), [fadeTo]);

  useEffect(() => {
    if (!loaded) return;
    if (on) start();
    else stop();
  }, [on, loaded, start, stop]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (on) start();
      } else {
        p.current.pause();
      }
    });
    return () => sub.remove();
  }, [on, start]);

  return null;
}

export function useAmbient() {
  return useContext(Ctx);
}
