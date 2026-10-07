import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GROUP_COLORS, type GroupColor } from '@/data/groups';
import { useLang } from '@/i18n';
import { colors, fonts } from '@/theme/tokens';

// The face of an invitation (design 10D): the group's colour running into ink, its
// emoji and name large, who is in as faces with one empty place for you, a line
// about what they are up to. Used to join (groups/join) and to invite (groups/invite).
export default function GroupInvitation({ emoji, name, color, line, names, children }: {
  emoji: string;
  name: string;
  color: GroupColor;
  line: string;
  names: string[];
  children?: ReactNode;
}) {
  const { t } = useLang();
  const tint = color === 'paper' ? colors.spot : GROUP_COLORS[color];
  return (
    <View style={styles.root}>
      <LinearGradient colors={[tint, '#2a0705', colors.ink]} locations={[0, 0.55, 0.9]} style={StyleSheet.absoluteFill} />
      <View style={styles.top}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.name} numberOfLines={2}>{name.toLowerCase()}</Text>
        <Text style={styles.line}>{line}</Text>
      </View>
      <View style={styles.faces}>
        {names.slice(0, 5).map((n, i) => (
          <View key={`${n}-${i}`} style={[styles.face, i > 0 && styles.overlap]}>
            <Text style={styles.faceText}>{(n || '?').charAt(0).toUpperCase()}</Text>
          </View>
        ))}
        <View style={[styles.face, styles.overlap, styles.you]}>
          <Text style={styles.youText}>{t('posts.you')}</Text>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  top: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 24 },
  emoji: { fontSize: 64 },
  name: { fontFamily: fonts.logo, fontSize: 42, lineHeight: 42, color: colors.paper, textAlign: 'center', marginTop: 6 },
  line: { fontFamily: fonts.regular, fontSize: 14, color: '#f3d6d4', marginTop: 6, textAlign: 'center' },
  faces: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  face: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#3a3632', borderWidth: 2.5, borderColor: '#2a0705', alignItems: 'center', justifyContent: 'center' },
  overlap: { marginLeft: -12 },
  faceText: { fontFamily: fonts.semibold, fontSize: 20, color: colors.paper },
  you: { backgroundColor: 'transparent', borderStyle: 'dashed', borderColor: colors.paper },
  youText: { fontFamily: fonts.medium, fontSize: 12, color: colors.paper },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
});
