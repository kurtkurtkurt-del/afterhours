import { useEffect, useState } from 'react';
import StaffPage, { Quiet } from '@/components/StaffPage';
import { Panel, Row } from '@/components/Row';
import { staffLog, type LogLine } from '@/data/staff';
import { useLang } from '@/i18n';

// Who made, changed or deleted what, newest first (staff_log).
export default function Log() {
  const { t } = useLang();
  const [list, setList] = useState<LogLine[] | null>(null);
  useEffect(() => {
    staffLog().then(setList, () => setList([]));
  }, []);
  return (
    <StaffPage title={t('staff.log')}>
      {list === null ? <Quiet text="…" /> : null}
      {list && !list.length ? <Quiet text={t('staff.log.none')} /> : null}
      {list?.length ? (
        <Panel>
          {list.map((l, i) => (
            <Row key={`${l.at}-${i}`} label={`${l.action} ${l.target}${l.note ? ` · ${l.note}` : ''}`} hint={`@${l.who} · ${l.at.slice(0, 16).replace('T', ' ')}`} />
          ))}
        </Panel>
      ) : null}
    </StaffPage>
  );
}
