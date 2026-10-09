import { useState } from 'react';
import { Alert } from 'react-native';
import CodeSheet from '@/components/CodeSheet';
import { report, type ReportKind } from '@/data/safety';
import { useLang } from '@/i18n';

// Report anything but a post (51_safety.sql), with an optional reason, as posts do.
// const { ask, sheet } = useReport(); … ask('comment', id) … render {sheet}.
export function useReport() {
  const { t } = useLang();
  const [what, setWhat] = useState<{ kind: ReportKind; target: string } | null>(null);
  const sheet = (
    <CodeSheet
      key={what ? `${what.kind}:${what.target}` : 'shut'}
      open={!!what}
      title={t('posts.report.why')}
      go={t('posts.report')}
      error={null}
      onSubmit={(why) => {
        const w = what;
        setWhat(null);
        if (!w) return;
        report(w.kind, w.target, why || null).then(
          () => Alert.alert(t('posts.report'), t('posts.report.done')),
          (e) => Alert.alert(t('posts.report'), String(e?.message ?? e).toLowerCase()),
        );
      }}
      onClose={() => setWhat(null)}
    />
  );
  return { ask: (kind: ReportKind, target: string) => setWhat({ kind, target }), sheet };
}
