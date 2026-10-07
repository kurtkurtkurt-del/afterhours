import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { coverUrl, GROUP_COLORS, type GroupColor } from '@/data/groups';
import { colors, radius } from '@/theme/tokens';

// A group's face: its cover photo, or its emoji on its colour.
export default function GroupBadge({ emoji, color, cover, size = 52 }: { emoji: string; color: GroupColor; cover: string | null; size?: number }) {
  const uri = coverUrl(cover);
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size > 80 ? radius.lg : radius.md, backgroundColor: GROUP_COLORS[color] ?? colors.spot }]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
