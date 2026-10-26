import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import StaffPage, { Quiet, Said } from '@/components/StaffPage';
import { Panel, Row, Value } from '@/components/Row';
import { hideComment } from '@/data/staff';
import { venueComments, type VenueComment } from '@/data/venues';
import { serverText } from '@/lib/serverText';
import { useRefreshOnFocus } from '@/hooks/useRefresh';
import { useLang } from '@/i18n';

// The comments under the room's nights, newest first; a tap hides or shows one
// (staff_comment_hide, 42). Hidden ones stay in the list, greyed, so they can come back.
export default function Comments() {
  const { venue } = useLocalSearchParams<{ venue: string }>();
  const tick = useRefreshOnFocus();
  const { t } = useLang();
  const [list, setList] = useState<VenueComment[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const load = () => {
    if (venue) venueComments(venue).then(setList, (e) => setSaid(serverText(e)));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue, tick]);
  const flip = (c: VenueComment) =>
    hideComment(c.id, !c.is_hidden)
      .then(load)
      .catch((e) => setSaid(serverText(e)));
  return (
    <StaffPage title={t('desk.comments')}>
      <Quiet text={t('desk.comments.hint')} />
      <Said text={said} bad />
      {list && !list.length ? <Quiet text={t('desk.comments.none')} /> : null}
      {list?.length ? (
        <Panel>
          {list.map((c) => (
            <Row
              key={c.id}
              label={c.is_hidden ? `(${t('staff.hidden')}) ${c.body}` : c.body}
              hint={[c.handle ? `@${c.handle}` : c.author, c.night.toLowerCase(), c.created_at.slice(0, 10)].filter(Boolean).join(' · ')}
              right={<Value text={c.is_hidden ? t('word.show') : t('word.hide')} />}
              onPress={() => flip(c)}
              danger={c.is_hidden}
            />
          ))}
        </Panel>
      ) : null}
      {list === null && !said ? <Quiet text="…" /> : null}
    </StaffPage>
  );
}
