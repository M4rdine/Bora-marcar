import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Button, Icon, Surface, tokens } from '../../../ui';

/**
 * O que a pessoa vê antes da primeira saída.
 *
 * A versão anterior mostrava o painel completo com tudo zerado: seis zeros, trinta e cinco células
 * de calendário em branco ocupando metade da tela e oito medalhas bloqueadas iguais. Pela regra do
 * pico e fim, esta é a última tela da navegação — e ela dizia, em seis números, que não havia nada.
 * Um convite com uma saída é mais honesto e leva a algum lugar.
 */
export function ProfileEmpty({ onStart }: { readonly onStart: () => void }) {
  return (
    <View style={styles.container}>
      <Surface strength="strong" radius="hero" padding={5} gap={3} style={styles.card}>
        <Icon name="medal" size={ICON_SIZE} color={tokens.color.gold} />
        <AppText variant="title">{t.profile.emptyTitle}</AppText>
        <AppText variant="body" tone="muted">
          {t.profile.emptyBody}
        </AppText>
        <Button label={t.profile.emptyAction} onPress={onStart} />
      </Surface>

      <View style={styles.steps}>
        {t.profile.emptySteps.map((step) => (
          <View key={step} style={styles.step}>
            <View style={styles.bullet} />
            <AppText variant="small" tone="muted" style={styles.stepText}>
              {step}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const ICON_SIZE = 44;
const BULLET = 5;

const styles = StyleSheet.create({
  container: { gap: tokens.space[4] },
  card: { alignItems: 'flex-start' },
  steps: { gap: tokens.space[2], paddingHorizontal: tokens.space[2] },
  step: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  bullet: {
    width: BULLET,
    height: BULLET,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.gold,
  },
  stepText: { flex: 1 },
});
