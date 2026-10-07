import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import StaffPage, { Quiet } from '@/components/StaffPage';
import { Mark, Panel, Row } from '@/components/Row';
import { staffNights, type StaffNight } from '@/data/staff';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';

// The nights made in the panel, newest first; a tap edits.
export default function Nights() {
  const { t } = useLang();
  const tick = useRefreshOnFocus();
  const [list, setList] = useState<StaffNight[] | null>(null);
  useEffect(() => {
    staffNights().then(setList, () => setList([]));
  }, [tick]);
  return (
    <StaffPage title={t('staff.nights')}>
      {list && !list.length ? <Quiet text={t('staff.nights.none')} /> : null}
      {list?.length ? (
        <Panel>
          {list.map((n) => (
            <Row
              key={n.id}
              label={n.title}
              hint={[n.starts_at.slice(0, 16).replace('T', ' '), n.city_slug, n.maker, n.source === 'user' ? t('staff.sentin') : null, n.review === 'pending' ? t('submit.pending') : n.review === 'rejected' ? t('submit.rejected') : n.is_published ? null : t('staff.hidden')].filter(Boolean).join(' · ')}
              right={<Mark kind="more" />}
              onPress={() => router.push({ pathname: '/panel/night', params: { id: n.id } })}
            />
          ))}
        </Panel>
      ) : null}
      {list === null ? <Quiet text="…" /> : null}
    </StaffPage>
  );
}
