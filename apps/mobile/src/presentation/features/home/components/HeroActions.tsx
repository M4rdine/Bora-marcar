import { useState } from 'react';

import type { EngineConfig, LocalDateTime } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { Button } from '../../../ui';
import type { HeroState } from '../heroState';
import type { PickableHour } from '../pickableHours';

import { HourPicker } from './HourPicker';

type Props = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly now: LocalDateTime;
  readonly busy: boolean;
  readonly pickableHours: readonly PickableHour[];
  readonly onPlan: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onLogNow: (hour: number, minute: number, hourScore: number) => void;
};

/** Minuto do registro: exato para a hora atual, senão a hora escolhida já foi inteira. */
const minuteFor = (hour: number, now: LocalDateTime): number => (hour < now.hour ? 0 : now.minute);

/**
 * Estado local do seletor de hora usado ao registrar fora de um plano ("Registrar atividade",
 * "Saí em outro horário" na expiração e no link do mesmo nome durante a confirmação). `null`
 * significa fechado; um número é a hora atualmente destacada nos chips.
 */
function useHourPicker(
  now: LocalDateTime,
  pickableHours: readonly PickableHour[],
  onLogNow: Props['onLogNow'],
) {
  const [pickingHour, setPickingHour] = useState<number | null>(null);
  return {
    pickingHour,
    open: () => setPickingHour(now.hour),
    cancel: () => setPickingHour(null),
    select: setPickingHour,
    confirm: () => {
      if (pickingHour === null) return;
      const score = pickableHours.find((h) => h.hour === pickingHour)?.score ?? 0;
      onLogNow(pickingHour, minuteFor(pickingHour, now), score);
      setPickingHour(null);
    },
  };
}

function PickingHourActions({
  hour,
  pickableHours,
  busy,
  onSelect,
  onConfirm,
  onCancel,
}: {
  readonly hour: number;
  readonly pickableHours: readonly PickableHour[];
  readonly busy: boolean;
  readonly onSelect: (hour: number) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <>
      <HourPicker options={pickableHours} selected={hour} onSelect={onSelect} />
      <Button label={t.home.confirmHour(hour)} kind="mint" onPress={onConfirm} disabled={busy} />
      <Button label={t.home.cancelPick} kind="quiet" onPress={onCancel} disabled={busy} />
    </>
  );
}

type DefaultActionsProps = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly busy: boolean;
  readonly onPlan: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onOpenPicker: () => void;
};

/** Botões de cada estado do herói quando o seletor de hora está fechado. */
function DefaultActions({
  state,
  config,
  busy,
  onPlan,
  onCancel,
  onConfirm,
  onOpenPicker,
}: DefaultActionsProps) {
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
          <Button label={t.home.logOther} kind="quiet" onPress={onOpenPicker} disabled={busy} />
        </>
      );
    case 'logNoPlan':
      return (
        <>
          <Button label={t.home.logNow} onPress={onOpenPicker} disabled={busy} />
          {state.expiredPlan ? (
            <Button label={t.home.cancelPlan} kind="quiet" onPress={onCancel} disabled={busy} />
          ) : null}
        </>
      );
    case 'noWindow':
      return <Button label={t.home.logOther} onPress={onOpenPicker} disabled={busy} />;
    case 'done':
      return null;
  }
}

export function HeroActions({
  state,
  config,
  now,
  busy,
  pickableHours,
  onPlan,
  onCancel,
  onConfirm,
  onLogNow,
}: Props) {
  const picker = useHourPicker(now, pickableHours, onLogNow);

  if (picker.pickingHour !== null) {
    return (
      <PickingHourActions
        hour={picker.pickingHour}
        pickableHours={pickableHours}
        busy={busy}
        onSelect={picker.select}
        onConfirm={picker.confirm}
        onCancel={picker.cancel}
      />
    );
  }

  return (
    <DefaultActions
      state={state}
      config={config}
      busy={busy}
      onPlan={onPlan}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onOpenPicker={picker.open}
    />
  );
}
