import { Linking, Pressable, StyleSheet, View } from 'react-native';
import LinkIcon from '@/components/LinkIcon';
import { LINKS } from '@/content/links';
import type { LinkKind } from '@/data/profile';
import { colors } from '@/theme/tokens';

// Always shown, filled in when added and only outlined when not; the others
// (tiktok, soundcloud, website) only once they are added.
const ALWAYS: LinkKind[] = ['instagram', 'spotify', 'x', 'whatsapp'];

// A profile's links as a centred row of round marks. A filled mark opens that
// network; an empty one calls onMissing (your own page: the edit page) or does nothing.
// compact: smaller marks, no top margin, left-aligned — for a row shared with the counts (your page).
export default function LinkMarks({ links, onMissing, compact }: { links: Partial<Record<LinkKind, string>>; onMissing?: () => void; compact?: boolean }) {
  const shown = LINKS.filter((l) => ALWAYS.includes(l.kind) || links[l.kind]);
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {shown.map((l) => {
        const v = links[l.kind];
        return (
          <Pressable
            key={l.kind}
            onPress={() => (v ? Linking.openURL(l.url(v)).catch(() => {}) : onMissing?.())}
            disabled={!v && !onMissing}
            hitSlop={6}
            accessibilityRole={v ? 'link' : 'button'}
            accessibilityLabel={l.label}
            accessibilityState={{ disabled: !v && !onMissing }}
            style={({ pressed }) => [styles.mark, compact && styles.markCompact, v ? styles.on : styles.off, pressed && styles.pressed]}
          >
            <LinkIcon kind={l.kind} size={compact ? 18 : 22} color={v ? colors.ink : colors.mute} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 22 },
  rowCompact: { justifyContent: 'flex-start', gap: 8, marginTop: 0 },
  mark: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  markCompact: { width: 36, height: 36, borderRadius: 18 },
  on: { backgroundColor: colors.paper },
  off: { borderWidth: 1, borderColor: colors.ink3 },
  pressed: { opacity: 0.7 },
});
