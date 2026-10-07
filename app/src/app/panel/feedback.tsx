import { useEffect, useState } from 'react';
import StaffPage, { Quiet } from '@/components/StaffPage';
import { Panel, Row, Value } from '@/components/Row';
import { feedbackList, markFeedback, type Feedback as Item } from '@/data/staff';
import { useLang } from '@/i18n';

// What people wrote through the feedback form (13_feedback.sql); a tap marks it done.
export default function Feedback() {
  const { t } = useLang();
  const [list, setList] = useState<Item[] | null>(null);
  const load = () => feedbackList().then(setList, () => setList([]));
  useEffect(() => {
    load();
  }, []);
  const flip = (f: Item) => {
    setList((l) => l?.map((x) => (x.id === f.id ? { ...x, handled: !f.handled } : x)) ?? l);
    markFeedback(f.id, !f.handled).catch(load);
  };
  // Open ones first.
  const sorted = list ? [...list].sort((a, b) => Number(a.handled) - Number(b.handled)) : null;
  return (
    <StaffPage title={t('staff.feedback')}>
      {sorted === null ? <Quiet text="…" /> : null}
      {sorted && !sorted.length ? <Quiet text={t('staff.feedback.none')} /> : null}
      {sorted?.length ? (
        <Panel>
          {sorted.map((f) => (
            <Row
              key={f.id}
              label={f.body}
              hint={[f.kind, f.author ?? f.contact ?? '—', f.created_at.slice(0, 10)].join(' · ')}
              right={<Value text={f.handled ? t('staff.feedback.open') : t('staff.feedback.done')} />}
              onPress={() => flip(f)}
            />
          ))}
        </Panel>
      ) : null}
    </StaffPage>
  );
}
