import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import Storage from 'expo-sqlite/kv-store';

const KEY = 'ambient.on';
const VOLUME = 0.7;
const FADE_MS = 600;
const STEP_MS = 40;

// ekranın arka plan müziği. varsayılan kapalı; tercih telefonda saklanır.
// açılınca yumuşak yükselir, kapanınca yumuşak söner, uygulama arkaya gidince durur.
export function useAmbient() {
  const player = useAudioPlayer(require('../../assets/intro/loop.m4a'));
  // hook'un döndürdüğü nesneyi doğrudan değiştirmek lint'e takılıyor; ref üzerinden gidiyoruz
  const p = useRef(player);
  useEffect(() => {
    p.current = player;
  }, [player]);
  const [on, setOn] = useState<boolean>(() => Storage.getItemSync(KEY) === '1');
  const fade = useRef<ReturnType<typeof setInterval> | null>(null);

  const fadeTo = useCallback(
    (target: number, then?: () => void) => {
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
    },
    [],
  );

  const start = useCallback(() => {
    p.current.loop = true;
    if (!p.current.playing) {
      p.current.volume = 0;
      p.current.play();
    }
    fadeTo(VOLUME);
  }, [fadeTo]);

  const stop = useCallback(() => fadeTo(0, () => p.current.pause()), [fadeTo]);

  useEffect(() => {
    // sessiz moda saygı, diğer uygulamaların sesini kesme, arka planda çalma
    setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
  }, []);

  useEffect(() => {
    if (on) start();
    else stop();
  }, [on, start, stop]);

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

  const toggle = useCallback(() => {
    setOn((v) => {
      Storage.setItemSync(KEY, v ? '0' : '1');
      return !v;
    });
  }, []);

  return { on, toggle };
}
