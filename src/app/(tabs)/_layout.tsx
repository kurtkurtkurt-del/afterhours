import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { TabBarFrame, TabItem } from '@/components/TabBar';

// asıl uygulama: beş sekme, altta özel panel. flow · djs · [yours] · map · account
export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBarFrame>
          <TabTrigger name="flow" href="/flow" asChild>
            <TabItem label="flow" />
          </TabTrigger>
          <TabTrigger name="djs" href="/djs" asChild>
            <TabItem label="djs" />
          </TabTrigger>
          <TabTrigger name="yours" href="/yours" asChild>
            <TabItem label="yours" raised />
          </TabTrigger>
          <TabTrigger name="map" href="/map" asChild>
            <TabItem label="map" />
          </TabTrigger>
          <TabTrigger name="account" href="/account" asChild>
            <TabItem label="account" />
          </TabTrigger>
        </TabBarFrame>
      </TabList>
    </Tabs>
  );
}
