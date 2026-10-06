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
export default function LinkMarks({ links, onMissing }: { links: Partial<Record<LinkKind, string>>; onMissing?: () => void }) {
  const shown = LINKS.filter((l) => ALWAYS.includes(l.kind) || links[l.kind]);
  return (
    <View style={styles.row}>
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
            style={({ pressed }) => [styles.mark, v ? styles.on : styles.off, pressed && styles.pressed]}
          >
            <LinkIcon kind={l.kind} size={22} color={v ? colors.ink : colors.mute} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 22 },
  mark: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.paper },
  off: { borderWidth: 1, borderColor: colors.ink3 },
  pressed: { opacity: 0.7 },
});
