import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ACTIVITY_IDS, type ActivityId } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { useEngineConfig } from '../../../queries/useEngineConfig';
import { useServices } from '../../../services/ServicesProvider';
import { usePreferences } from '../../../state/preferencesStore';
import { activityIcon, AppText, Button, Icon, Surface, tokens } from '../../../ui';

const TOTAL_STEPS = 2;
const ACTIVITY_ICON_SIZE = 26;
const CHECK_SIZE = 18;

/**
 * Pontos de progresso. Duas perguntas curtas prendem mais que um cartão explicando três passos:
 * a pessoa entra no app respondendo, e sai dele já configurada.
 */
function Progress({ step }: { readonly step: number }) {
  return (
    <View accessibilityLabel={t.home.onboarding.progress(step, TOTAL_STEPS)} style={styles.dots}>
      {Array.from({ length: TOTAL_STEPS }, (_, index) => (
        <View key={index} style={[styles.dot, index < step ? styles.dotOn : null]} />
      ))}
    </View>
  );
}

/**
 * Uma atividade da lista, marcável.
 *
 * Era um toque que já avançava de passo: dava para gostar de exatamente uma coisa. Quem corre e
 * pedala tinha de escolher uma e conviver com a outra em segundo plano. Agora marca quantas
 * quiser e confirma — e a marca vira a ordem das abas na tela inicial.
 */
function ActivityOption({
  id,
  name,
  selected,
  onToggle,
}: {
  readonly id: ActivityId;
  readonly name: string;
  readonly selected: boolean;
  readonly onToggle: () => void;
}) {
  const hint = t.home.onboarding.activityHints[id];
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={
        selected
          ? t.home.onboarding.activityAriaSelected(name, hint)
          : t.home.onboarding.activityAria(name, hint)
      }
      onPress={onToggle}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.optionOn : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Icon name={activityIcon(id)} size={ACTIVITY_ICON_SIZE} color={tokens.color.text} />
      <View style={styles.optionBody}>
        <AppText variant="subtitle" weight="700">
          {name}
        </AppText>
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      </View>
      {selected ? <Icon name="starFilled" size={CHECK_SIZE} color={tokens.color.mint} /> : null}
    </Pressable>
  );
}

/**
 * Primeiro acesso: duas perguntas antes da tela principal. Sem cidade escolhida o app não tem o
 * que mostrar, então a configuração deixa de ser um obstáculo e vira a própria porta de entrada.
 */
export function Welcome() {
  const router = useRouter();
  const services = useServices();
  const config = useEngineConfig();
  const selectCity = usePreferences((s) => s.selectCity);
  const selectFavoriteActivities = usePreferences((s) => s.selectFavoriteActivities);
  const [step, setStep] = useState(1);
  const [chosen, setChosen] = useState<readonly ActivityId[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resolveLocation = async () => {
    setError(null);
    const r = await services.resolveMyLocation();
    if (r.ok) selectCity(r.value);
    else setError(t.errors[r.error.code]);
  };

  // Marcar e desmarcar preservando a ORDEM em que foram escolhidas: é ela que decide a ordem das
  // abas depois, então a primeira marcada é a que abre selecionada.
  const toggleActivity = (id: ActivityId) =>
    setChosen((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  const confirmActivities = () => {
    if (chosen.length === 0) return;
    selectFavoriteActivities(chosen);
    setStep(TOTAL_STEPS);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Progress step={step} />

      {step === 1 ? (
        <>
          <AppText variant="small" tone="muted">
            {t.home.onboarding.lead}
          </AppText>
          <AppText variant="title" weight="700">
            {t.home.onboarding.activityQuestion}
          </AppText>
          <AppText variant="small" tone="muted">
            {t.home.onboarding.activityHelp}
          </AppText>
          <View style={styles.options}>
            {ACTIVITY_IDS.map((id) => {
              const activity = config.data?.activities[id];
              if (activity === undefined) return null;
              return (
                <ActivityOption
                  key={id}
                  id={id}
                  name={activity.name}
                  selected={chosen.includes(id)}
                  onToggle={() => toggleActivity(id)}
                />
              );
            })}
          </View>
          {chosen.length === 0 ? (
            <AppText variant="small" tone="muted">
              {t.home.onboarding.activityPickAtLeastOne}
            </AppText>
          ) : (
            <Button
              label={t.home.onboarding.activityContinue(chosen.length)}
              onPress={confirmActivities}
            />
          )}
        </>
      ) : (
        <>
          <AppText variant="title" weight="700">
            {t.home.onboarding.placeQuestion}
          </AppText>
          <AppText variant="small" tone="muted">
            {t.home.onboarding.placeHelp}
          </AppText>
          <Button label={t.home.useLocation} onPress={() => void resolveLocation()} />
          <Button label={t.home.searchCity} kind="quiet" onPress={() => router.push('/cities')} />
          {error ? (
            <Surface radius="card" padding={3}>
              <AppText variant="small" style={styles.error}>
                {error}
              </AppText>
            </Surface>
          ) : null}
          <Button
            label={t.home.onboarding.back}
            kind="quiet"
            onPress={() => {
              setError(null);
              setStep(1);
            }}
          />
        </>
      )}
    </ScrollView>
  );
}

const DOT = 8;

const styles = StyleSheet.create({
  container: { padding: tokens.space[5], gap: tokens.space[3] },
  dots: { flexDirection: 'row', gap: tokens.space[1], paddingBottom: tokens.space[2] },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.border,
  },
  dotOn: { backgroundColor: tokens.color.accent },
  options: { gap: tokens.space[2] },
  option: {
    minHeight: tokens.size.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.surface,
  },
  optionBody: { flex: 1, gap: tokens.space[1] },
  optionOn: {
    backgroundColor: tokens.color.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.color.mint,
  },
  pressed: { opacity: 0.6 },
  error: { color: tokens.color.danger },
});
