import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { TabBarFrame, TabItem } from '@/components/TabBar';
import { useCities } from '@/data/cities';
import { useFollowLocation } from '@/data/here';

// asıl uygulama: beş sekme, altta yüzen panel. flow · djs · [yours] · map · account
export default function TabsLayout() {
  // bulunduğun şehir: bütün sekmeler bunu izler (data/here.ts)
  const { cities } = useCities();
  useFollowLocation(cities);
  return (
    <Tabs>
      <TabSlot />
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
