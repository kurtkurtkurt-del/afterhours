import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { TabList, TabSlot, TabTrigger, Tabs, type TabsSlotRenderOptions } from 'expo-router/ui';
import { Screen } from 'react-native-screens';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TabBarFrame, TabItem } from '@/components/TabBar';
import { useCities } from '@/data/cities';
import { useFollowLocation } from '@/data/here';

// The main app: five tabs in an edge-to-edge bottom bar: messages · connect (people) · flow · map · account.
// Since 26.10.2026 (design 2 of prototypes/nav-bar.html) the flow sits in the middle as a red card that
// rises out of the bar; before that connect was in the middle (owner, 12.10.2026).
// The staff panel is a page of its own since 11.10.2026, reached from the account page.
// yours is hidden since 12.10.2026 (owner: a feed is the wrong shape; the file stays, no tab
// leads to it); people became connect (groups, the gallery, the decks) and messages is a tab of its own.
export default function TabsLayout() {
  // Every tab follows the city you are in (data/here.ts).
  const { cities } = useCities();
  useFollowLocation(cities);
  return (
    <Tabs>
      <TabSlot renderFn={renderTab} style={styles.slot} />
      <TabList asChild>
        <TabBarFrame>
          <TabTrigger name="messages" href="/messages" asChild>
            <TabItem icon="chat" />
          </TabTrigger>
          <TabTrigger name="people" href="/people" asChild>
            <TabItem icon="people" />
          </TabTrigger>
          <TabTrigger name="flow" href="/flow" asChild>
            <TabItem icon="flow" />
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

// Switching tabs lifts the content 8 px into place instead of snapping (no fade: see below).
// Otherwise identical to expo-router's default renderer; only the focused tab animates.
type Descriptor = Parameters<NonNullable<Parameters<typeof TabSlot>[0]['renderFn']>>[0];

// A tab you leave is detached again (owner, 28.10.2026): kept attached behind the open one, the
// hidden tabs caught the touches at the top of the page and the flow's and the map's buttons
// did nothing. The empty flow it was meant to fix came from the fade: the page started at
// opacity 0 and could stay there. Now it only rises into place and is never see-through.
function renderTab(descriptor: Descriptor, { isFocused, loaded, detachInactiveScreens }: TabsSlotRenderOptions) {
  if (!loaded && !isFocused) return null;
  return (
    <Screen key={descriptor.route.key} enabled={detachInactiveScreens} activityState={isFocused ? 2 : 0} pointerEvents={isFocused ? 'auto' : 'none'} style={[styles.screen, isFocused ? styles.focused : styles.unfocused]}>
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
    transform: [{ translateY: (1 - shown.get()) * 8 }],
  }));
  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  // expo-router's container does not shrink (flex-basis auto, shrink 0): on the web a tab
  // grew to its content, so its ScrollView never scrolled and tips sat below the tab bar.
  slot: { flexBasis: 0, flexShrink: 1, minHeight: 0 },
  fill: { flex: 1 },
  screen: { flex: 1, position: 'relative', height: '100%' },
  focused: { zIndex: 1, display: 'flex', flexShrink: 0, flexGrow: 1 },
  unfocused: { zIndex: -1, display: 'none', flexShrink: 1, flexGrow: 0 },
});
