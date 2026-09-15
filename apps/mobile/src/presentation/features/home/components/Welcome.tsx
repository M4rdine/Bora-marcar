import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { useServices } from '../../../services/ServicesProvider';
import { usePreferences } from '../../../state/preferencesStore';
import { AppText, Button, Emoji, Surface, tokens } from '../../../ui';

/** Três passos do ciclo do app, para a tela de boas-vindas não ser só dois botões num céu. */
function HowItWorks() {
  return (
    <Surface padding={4} gap={3}>
      <AppText variant="kicker">{t.home.howTitle}</AppText>
      {t.home.howSteps.map((step, index) => (
        <View key={step.emoji} style={styles.step}>
          <View style={styles.stepBadge}>
            <Emoji symbol={step.emoji} size={STEP_EMOJI_SIZE} label={t.home.stepLabel(index + 1)} />
          </View>
          <AppText variant="body" style={styles.stepText}>
            {step.text}
          </AppText>
        </View>
      ))}
    </Surface>
  );
}

export function Welcome() {
  const router = useRouter();
  const services = useServices();
  const selectCity = usePreferences((s) => s.selectCity);
  const [error, setError] = useState<string | null>(null);

  const resolveLocation = async () => {
    const r = await services.resolveMyLocation();
    if (r.ok) selectCity(r.value);
    else setError(t.errors[r.error.code]);
  };

  return (
    <View style={styles.container}>
      <AppText variant="title">{t.home.welcomeTitle}</AppText>
      <AppText variant="body">{t.home.welcomeBody}</AppText>
      <HowItWorks />
      <Button label={t.home.searchCity} onPress={() => router.push('/cities')} />
      <Button label={t.home.useLocation} kind="quiet" onPress={() => void resolveLocation()} />
      {error ? (
        <AppText variant="small" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const STEP_EMOJI_SIZE = 20;

const styles = StyleSheet.create({
  container: { padding: tokens.space[5], gap: tokens.space[3] },
  step: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  stepBadge: {
    width: tokens.size.orb,
    height: tokens.size.orb,
    borderRadius: tokens.radius.inner,
    backgroundColor: tokens.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { flex: 1 },
  error: { color: tokens.color.danger },
});
