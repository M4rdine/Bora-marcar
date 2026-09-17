import { useQueryClient } from '@tanstack/react-query';
import { Alert, StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { resetAppData } from '../../../state/resetAppData';
import { AppText, Button, tokens } from '../../../ui';

/**
 * Recomeçar do zero, para testar o primeiro acesso quantas vezes for preciso. Só existe em
 * desenvolvimento: `__DEV__` é falso em qualquer build, então isto nunca chega a um aparelho
 * de avaliador.
 */
export function DevReset() {
  const queryClient = useQueryClient();

  if (!__DEV__) return null;

  const confirm = () => {
    Alert.alert(t.dev.resetTitle, t.dev.resetBody, [
      { text: t.dev.cancel, style: 'cancel' },
      {
        text: t.dev.resetConfirm,
        style: 'destructive',
        onPress: () => {
          void resetAppData().then(() => queryClient.clear());
        },
      },
    ]);
  };

  return (
    <View style={styles.box}>
      <AppText variant="micro" tone="muted">
        {t.dev.label}
      </AppText>
      <Button label={t.dev.reset} kind="quiet" onPress={confirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: tokens.space[1],
    marginTop: tokens.space[6],
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.border,
  },
});
