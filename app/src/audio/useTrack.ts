import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus, type AudioSource } from 'expo-audio';
import { useAmbient } from '@/audio/AmbientContext';

// The one track playing anywhere in the app. Starting another stops it first, so a clip on
// the shelf and a card in an open deck never play over each other.
let current: { owner: symbol; stop: () => void } | null = null;

// One short track at a time for a screen (clips, "listen", a DJ's sets). Playing hushes
// the background music; stopping, the track ending or leaving the screen brings it back.
// key identifies what is playing, so the screen can mark it.
export function useTrack(onEnd?: (key: string) => void) {
  const { hush } = useAmbient();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [playing, setPlaying] = useState<string | null>(null);
  const [owner] = useState(() => Symbol('track'));

  const stop = useCallback(() => {
    try {
      player.pause();
    } catch {
      /* already released */
    }
    if (current?.owner === owner) current = null;
    setPlaying(null);
    hush(false);
  }, [player, hush, owner]);
  const latestStop = useRef(stop);
  useEffect(() => {
    latestStop.current = stop;
  }, [stop]);

  const play = (key: string, source: AudioSource) => {
    if (playing === key) return stop();
    if (current && current.owner !== owner) current.stop();
    current = { owner, stop: () => latestStop.current() };
    player.replace(source);
    player.play();
    setPlaying(key);
    hush(true);
  };

  useEffect(() => {
    if (!playing) return;
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (!s.didJustFinish) return;
      stop();
      onEnd?.(playing);
    });
    return () => sub.remove();
  }, [player, playing, stop, onEnd]);

  useFocusEffect(useCallback(() => () => stop(), [stop]));

  const duration = playing && status.duration ? status.duration : 0;
  return { playing, play, stop, elapsed: playing ? status.currentTime : 0, duration };
}
