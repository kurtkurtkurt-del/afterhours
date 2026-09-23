import { Tabs, TabSlot } from 'expo-router/ui';
import TabBar from '@/components/TabBar';

// asıl uygulama: beş sekme, altta özel panel.
export default function TabsLayout() {
  return (
    <Tabs>
      <TabSlot />
      <TabBar />
    </Tabs>
  );
}
