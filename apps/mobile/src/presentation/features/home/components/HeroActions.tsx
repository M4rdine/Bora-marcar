import type { EngineConfig } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { Button } from '../../../ui';
import type { HeroState } from '../heroState';

type Props = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly busy: boolean;
  readonly onPlan: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onLogNow: () => void;
};

export function HeroActions({ state, config, busy, onPlan, onCancel, onConfirm, onLogNow }: Props) {
  switch (state.kind) {
    case 'plan': {
      const { base, planBonus } = config.xp;
      return (
        <Button
          label={t.home.plan(config.activities[state.day.activityId].name, state.window.startHour)}
          subtext={t.home.planSubtext(base, planBonus)}
          onPress={onPlan}
          disabled={busy}
        />
      );
    }
    case 'planned':
      return <Button label={t.home.cancelPlan} kind="quiet" onPress={onCancel} disabled={busy} />;
    case 'confirm':
      return (
        <>
          <Button label={t.home.confirm} kind="mint" onPress={onConfirm} disabled={busy} />
          <Button label={t.home.logOther} kind="quiet" onPress={onLogNow} disabled={busy} />
        </>
      );
    case 'logNoPlan':
      return (
        <>
          <Button label={t.home.logNow} onPress={onLogNow} disabled={busy} />
          {state.expiredPlan ? (
            <Button label={t.home.cancelPlan} kind="quiet" onPress={onCancel} disabled={busy} />
          ) : null}
        </>
      );
    case 'noWindow':
      return <Button label={t.home.logOther} onPress={onLogNow} disabled={busy} />;
    case 'done':
      return null;
  }
}
