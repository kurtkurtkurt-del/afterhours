import { useCallback } from 'react';
import { router } from 'expo-router';
import Intro from '@/components/Intro';

export default function IntroScreen() {
  const done = useCallback(() => router.replace('/city'), []);
  return <Intro onDone={done} />;
}
