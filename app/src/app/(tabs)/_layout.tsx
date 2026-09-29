import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs, type TabsSlotRenderOptions } from 'expo-router/ui';
import { Screen } from 'react-native-screens';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TabBarFrame, TabItem } from '@/components/TabBar';
import { useCities } from '@/data/cities';
import { useFollowLocation } from '@/data/here';

// The main app: five tabs in a floating bar. flow · djs · [yours] · map · account
export default function TabsLayout() {
  // Every tab follows the city you are in (data/here.ts).
  const { cities } = useCities();
  useFollowLocation(cities);
  return (
    <Tabs>
      <TabSlot renderFn={renderTab} />
      <TabList asChild>
        <TabBarFrame>
          <TabTrigger name="flow" href="/flow" asChild>
            <TabItem icon="flow" />
          </TabTrigger>
          <TabTrigger name="djs" href="/djs" asChild>
            <TabItem icon="djs" />
          </TabTrigger>
          <TabTrigger name="yours" href="/yours" asChild>
            <TabItem icon="yours" raised />
          </TabTrigger>
          <TabTrigger name="map" href="/map" asChild>
            <TabItem icon="map" />
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabItem icon="account" />
          </TabTrigger>
        </TabBarFrame>
      </TabList>
    </Tabs>
  );
}

// Switching tabs fades the content in and lifts it 8 px instead of snapping.
// Otherwise identical to expo-router's default renderer; only the focused tab animates.
type Descriptor = Parameters<NonNullable<Parameters<typeof TabSlot>[0]['renderFn']>>[0];

function renderTab(descriptor: Descriptor, { isFocused, loaded, detachInactiveScreens }: TabsSlotRenderOptions) {
  if (!loaded && !isFocused) return null;
  return (
    <Screen key={descriptor.route.key} enabled={detachInactiveScreens} activityState={isFocused ? 2 : 0} style={[styles.screen, isFocused ? styles.focused : styles.unfocused]}>
      <TabFade focused={isFocused}>{descriptor.render()}</TabFade>
    </Screen>
  );
}

const IN = { duration: 260, easing: Easing.out(Easing.cubic) };

function TabFade({ focused, children }: { focused: boolean; children: ReactNode }) {
  const shown = useSharedValue(0);
  useEffect(() => {
    if (focused) {
      shown.set(0);
      shown.set(withTiming(1, IN));
    }
  }, [focused, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: (1 - shown.get()) * 8 }],
  }));
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screen: { flex: 1, position: 'relative', height: '100%' },
  focused: { zIndex: 1, display: 'flex', flexShrink: 0, flexGrow: 1 },
  unfocused: { zIndex: -1, display: 'none', flexShrink: 1, flexGrow: 0 },
});
