import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { useServices } from '../../../services/ServicesProvider';
import { usePreferences } from '../../../state/preferencesStore';
import { AppText, Button, tokens } from '../../../ui';

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

const styles = StyleSheet.create({
  container: { padding: tokens.space[5], gap: tokens.space[3] },
  error: { color: tokens.color.danger },
});
