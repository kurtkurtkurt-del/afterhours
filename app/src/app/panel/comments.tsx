import { useEffect, useState } from 'react';
import StaffPage, { Quiet } from '@/components/StaffPage';
import { Panel, Row, Value } from '@/components/Row';
import { hideComment, staffComments, type StaffComment } from '@/data/staff';
import { useLang } from '@/i18n';

// The newest comments; a tap hides one, or shows it again.
export default function Comments() {
  const { t } = useLang();
  const [list, setList] = useState<StaffComment[] | null>(null);
  const load = () => staffComments().then(setList, () => setList([]));
  useEffect(() => {
    load();
  }, []);
  const flip = (c: StaffComment) => {
    setList((l) => l?.map((x) => (x.id === c.id ? { ...x, is_hidden: !c.is_hidden } : x)) ?? l);
    hideComment(c.id, !c.is_hidden).catch(load);
  };
  return (
    <StaffPage title={t('staff.comments')}>
      {list === null ? <Quiet text="…" /> : null}
      {list && !list.length ? <Quiet text={t('staff.comments.none')} /> : null}
      {list?.length ? (
        <Panel>
          {list.map((c) => (
            <Row
              key={c.id}
              label={c.body.length > 140 ? `${c.body.slice(0, 140)}…` : c.body}
              hint={[c.author ?? '—', c.night, c.created_at.slice(0, 16).replace('T', ' ')].join(' · ')}
              right={<Value text={c.is_hidden ? t('staff.show') : t('staff.hide')} />}
              onPress={() => flip(c)}
            />
          ))}
        </Panel>
      ) : null}
    </StaffPage>
  );
}
