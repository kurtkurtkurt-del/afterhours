import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import Button from '@/components/Button';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import { useAuth } from '@/auth/AuthContext';
import { albumAdd, albumRemove, groupAlbum, photoUrl, why, type AlbumPhoto } from '@/data/groups';
import { useLang } from '@/i18n';
import { colors, fonts, radius } from '@/theme/tokens';

// One night's album for a group: what members added, oldest first. A long press
// takes a photo out (yours, or any if you own the group; the database decides).
export default function Album() {
  const { id, event } = useLocalSearchParams<{ id: string; event: string }>();
  const { t } = useLang();
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const [photos, setPhotos] = useState<AlbumPhoto[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => groupAlbum(id, event).then(setPhotos, (e) => setSaid(why(e))), [id, event]);
  useEffect(() => {
    load();
  }, [load]);
  const add = () => {
    setBusy(true);
    setSaid(null);
    albumAdd(id, event, uid)
      .then((added) => {
        if (added) return load();
      })
      .catch((e) => setSaid(why(e)))
      .finally(() => setBusy(false));
  };
  const remove = (p: AlbumPhoto) =>
    Alert.alert(t('staff.delete'), t('groups.album.remove'), [
      { text: t('staff.delete.keep'), style: 'cancel' },
      { text: t('staff.delete'), style: 'destructive', onPress: () => albumRemove(p.id, uid).then(load, (e) => setSaid(why(e))) },
    ]);
  return (
    <StaffPage title={t('groups.album')}>
      <Button label={busy ? '…' : t('groups.album.add')} onPress={busy ? undefined : add} />
      <Said text={said} bad />
      {photos && !photos.length ? <Quiet text={t('groups.album.none')} /> : null}
      <View style={styles.grid}>
        {photos?.map((p) => {
          const uri = photoUrl(p.path);
          return (
            <Pressable key={p.id} onLongPress={() => remove(p)} style={styles.cell}>
              {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <Text style={styles.by} numberOfLines={1}>{p.mine ? t('posts.you') : (p.name ?? '').toLowerCase()}</Text>
            </Pressable>
          );
        })}
      </View>
    </StaffPage>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  cell: { width: '32%', aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.ink3, justifyContent: 'flex-end' },
  by: { margin: 5, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: 'rgba(14,13,12,0.6)', fontFamily: fonts.regular, fontSize: 10, color: colors.paper },
});
