import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { EngineConfig } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import type { HeroState } from '../heroState';

type Props = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly busy: boolean;
  readonly errorMessage: string | null;
  readonly onPlan: () => void;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onLogNow: () => void;
};

function Body({ state }: Pick<Props, 'state'>) {
  switch (state.kind) {
    case 'plan':
      return (
        <>
          <Text style={styles.kicker}>{t.home.bestToday}</Text>
          <Text style={styles.big}>{`${state.window.startHour}h – ${state.window.endHour}h`}</Text>
          <Text>{`${t.labels[state.day.label ?? 'poor']} · ${state.score}`}</Text>
          {state.day.sentence ? <Text>{state.day.sentence}</Text> : null}
          {state.day.caveat ? <Text>{state.day.caveat}</Text> : null}
          {state.day.tips.length > 0 ? (
            <Text>{state.day.tips.map((tip) => tip.text).join(' · ')}</Text>
          ) : null}
        </>
      );
    case 'planned':
      return <Text style={styles.big}>{t.home.planned(state.plan.window.startHour)}</Text>;
    case 'confirm':
      return (
        <>
          <Text
            style={styles.big}
          >{`${state.plan.window.startHour}h – ${state.plan.window.endHour}h`}</Text>
          {state.nowScore !== null ? <Text>{`${t.home.now} · ${state.nowScore}`}</Text> : null}
        </>
      );
    case 'done':
      return (
        <>
          <Text style={styles.big}>{t.home.done(state.record.hourLeft, 0)}</Text>
          <Text>{t.home.xpEarned(state.record.xp.total)}</Text>
        </>
      );
    case 'logNoPlan':
      return (
        <>
          <Text style={styles.kicker}>{t.home.windowPassed}</Text>
          {state.expiredPlan ? (
            <Text style={styles.big}>{t.home.planExpired(state.expiredPlan.window.startHour)}</Text>
          ) : null}
        </>
      );
    case 'noWindow': {
      const dominant = state.day.result.kind === 'none' ? state.day.result.dominant : null;
      return (
        <>
          <Text style={styles.big}>{t.home.noWindow}</Text>
          {dominant ? <Text>{t.home.noWindowBecause(t.reasons[dominant])}</Text> : null}
        </>
      );
    }
  }
}

function Actions({
  state,
  config,
  busy,
  onPlan,
  onCancel,
  onConfirm,
  onLogNow,
}: Omit<Props, 'errorMessage'>) {
  const button = (label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={busy} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  switch (state.kind) {
    case 'plan':
      return button(
        t.home.plan(config.activities[state.day.activityId].name, state.window.startHour),
        onPlan,
      );
    case 'planned':
      return button(t.home.cancelPlan, onCancel);
    case 'confirm':
      return (
        <>
          {button(t.home.confirm, onConfirm)}
          {button(t.home.logOther, onLogNow)}
        </>
      );
    case 'logNoPlan':
      return (
        <>
          {button(t.home.logNow, onLogNow)}
          {state.expiredPlan ? button(t.home.cancelPlan, onCancel) : null}
        </>
      );
    case 'noWindow':
      return button(t.home.logOther, onLogNow);
    case 'done':
      return null;
  }
}

export function HeroCard(props: Props) {
  return (
    <View style={styles.card} accessibilityLabel="hero">
      <Body state={props.state} />
      <Actions {...props} />
      {props.errorMessage ? <Text style={styles.error}>{props.errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, backgroundColor: '#f4f4f4', gap: 8 },
  kicker: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  big: { fontSize: 32, fontWeight: '700' },
  button: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b00020' },
});
