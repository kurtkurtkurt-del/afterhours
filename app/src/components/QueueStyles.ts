import { StyleSheet } from 'react-native';
import { colors, fonts, radius } from '@/theme/tokens';

// The panel's queues as piles to swipe (design 15B): pending nights and reported posts.
export const queueStyles = StyleSheet.create({
  count: { fontFamily: fonts.jet, fontSize: 10, letterSpacing: 1.4, color: colors.spotText, textAlign: 'right' },
  pile: { height: 470, marginTop: 8 },
  card: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.ink3 },
  cardText: { padding: 18, gap: 6 },
  title: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 30, letterSpacing: -0.8, color: colors.paper },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: '#ddd' },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.paper },
  link: { fontFamily: fonts.regular, fontSize: 13, color: colors.paper, textDecorationLine: 'underline' },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.ink3, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.paper, borderColor: colors.paper },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.paper },
  chipTextOn: { color: colors.ink },
});
