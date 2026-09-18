import { useState } from 'react';

import { labelFor, type DayRecommendation, type EngineConfig, type LocalDateTime } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { Button } from '../../../ui';
import type { HeroState } from '../heroState';
import type { PickableHour } from '../pickableHours';
import { tomorrowShortcut, type TomorrowShortcut } from '../tomorrowShortcut';

import { HourPicker } from './HourPicker';

type Props = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly now: LocalDateTime;
  /** Primeiro dia da previsão depois de hoje, quando existe: fonte dos atalhos para amanhã. */
  readonly tomorrow: DayRecommendation | null;
  readonly busy: boolean;
  readonly pickableHours: readonly PickableHour[];
  readonly onPlan: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onLogNow: (hour: number, minute: number, hourScore: number) => void;
  /** Abre `/day/[date]` de amanhã, onde o planejamento de fato acontece. */
  readonly onOpenTomorrow: () => void;
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
      <Button
        label={t.home.confirmHour(hour)}
        kind="mint"
        onPress={onConfirm}
        loading={busy}
        loadingLabel={t.home.working}
      />
      <Button label={t.home.cancelPick} kind="quiet" onPress={onCancel} disabled={busy} />
    </>
  );
}

type TomorrowProps = {
  readonly shortcut: TomorrowShortcut | null;
  readonly config: EngineConfig;
  readonly busy: boolean;
  readonly onOpenTomorrow: () => void;
};

/** Atalho "Amanhã: 6h – 9h, ótimo", o botão primário quando hoje não tem janela boa. */
function SeeTomorrowButton({ shortcut, config, busy, onOpenTomorrow }: TomorrowProps) {
  if (shortcut === null) return null;
  return (
    <Button
      label={t.home.seeTomorrow(
        shortcut.startHour,
        shortcut.endHour,
        labelFor(shortcut.score, config),
      )}
      onPress={onOpenTomorrow}
      disabled={busy}
    />
  );
}

/** Atalho "Planejar amanhã às 6h" no estado concluído; o plano em si é feito na tela do dia. */
function PlanTomorrowButton({ shortcut, busy, onOpenTomorrow }: Omit<TomorrowProps, 'config'>) {
  if (shortcut === null) return null;
  return (
    <Button
      label={t.home.planTomorrowShortcut(shortcut.startHour)}
      kind="quiet"
      onPress={onOpenTomorrow}
      disabled={busy}
    />
  );
}

type DefaultActionsProps = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly shortcut: TomorrowShortcut | null;
  readonly busy: boolean;
  readonly onPlan: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onOpenPicker: () => void;
  readonly onOpenTomorrow: () => void;
};

/** Botões de cada estado do herói quando o seletor de hora está fechado. */
function DefaultActions({
  state,
  config,
  shortcut,
  busy,
  onPlan,
  onCancel,
  onConfirm,
  onOpenPicker,
  onOpenTomorrow,
}: DefaultActionsProps) {
  const tomorrowProps = { shortcut, busy, onOpenTomorrow };
  // Mesma condição de `SeeTomorrowButton` existir: sem atalho, registrar é a única ação e volta a
  // ser o botão primário.
  const hasTomorrowShortcut = shortcut !== null;
  switch (state.kind) {
    case 'plan': {
      const { base, planBonus } = config.xp;
      return (
        <Button
          label={t.home.plan(config.activities[state.day.activityId].name, state.window.startHour)}
          subtext={t.home.planSubtext(base, planBonus)}
          onPress={onPlan}
          loading={busy}
          loadingLabel={t.home.working}
        />
      );
    }
    case 'planned':
      return (
        <Button
          label={t.home.cancelPlan}
          kind="quiet"
          onPress={onCancel}
          loading={busy}
          loadingLabel={t.home.working}
        />
      );
    case 'confirm':
      return (
        <>
          <Button
            label={t.home.confirm}
            kind="mint"
            onPress={onConfirm}
            loading={busy}
            loadingLabel={t.home.working}
          />
          <Button label={t.home.logOther} kind="quiet" onPress={onOpenPicker} disabled={busy} />
        </>
      );
    case 'logNoPlan':
      return (
        <>
          <Button label={t.home.logNow} onPress={onOpenPicker} disabled={busy} />
          {state.expiredPlan ? (
            <Button
              label={t.home.cancelPlan}
              kind="quiet"
              onPress={onCancel}
              loading={busy}
              loadingLabel={t.home.working}
            />
          ) : null}
        </>
      );
    case 'noWindow':
      return (
        <>
          <SeeTomorrowButton {...tomorrowProps} config={config} />
          <Button
            label={t.home.logOther}
            kind={hasTomorrowShortcut ? 'quiet' : 'primary'}
            onPress={onOpenPicker}
            disabled={busy}
          />
        </>
      );
    case 'done':
      // Registrar uma atividade não encerra o dia. Antes o `done` só oferecia planejar o dia
      // SEGUINTE, então quem saísse de manhã ficava preso no recibo de XP até a meia-noite.
      return (
        <>
          <Button label={t.home.logAgain} onPress={onOpenPicker} disabled={busy} />
          <PlanTomorrowButton {...tomorrowProps} />
        </>
      );
  }
}

export function HeroActions({
  state,
  config,
  now,
  tomorrow,
  busy,
  pickableHours,
  onPlan,
  onCancel,
  onConfirm,
  onLogNow,
  onOpenTomorrow,
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
      shortcut={tomorrowShortcut(tomorrow)}
      busy={busy}
      onPlan={onPlan}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onOpenPicker={picker.open}
      onOpenTomorrow={onOpenTomorrow}
    />
  );
}
