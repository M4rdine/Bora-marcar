import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Icon, Surface, tokens, type IconName } from '../../../ui';

type Props = {
  readonly streak: number;
  readonly activities: number;
  readonly unlockedBadges: number;
};

type Stat = {
  readonly icon: IconName;
  readonly value: number;
  /** Rótulo visível, sem o número (que já aparece grande logo acima). */
  readonly label: string;
  /** Rótulo completo para o leitor de tela. */
  readonly a11y: string;
};

/** O placar é lido pela Surface inteira, então o desenho é decorativo. */
const STAT_ICON_SIZE = 22;

/**
 * Três placares: sequência, atividades e conquistas. A contagem de cidades saiu porque nada no
 * app recompensa variar de cidade, então o número não respondia a nenhuma pergunta do usuário.
 */
export function StatsRow({ streak, activities, unlockedBadges }: Props) {
  const stats: readonly Stat[] = [
    {
      icon: 'flame',
      value: streak,
      label: t.profile.statLabels.streak(streak),
      a11y: t.profile.streak(streak),
    },
    {
      icon: 'run',
      value: activities,
      label: t.profile.statLabels.activities(activities),
      a11y: t.profile.activities(activities),
    },
    {
      icon: 'medal',
      value: unlockedBadges,
      label: t.profile.statLabels.achievements(unlockedBadges),
      a11y: t.profile.unlockedCount(unlockedBadges),
    },
  ];
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <Surface
          key={stat.icon}
          accessible
          accessibilityLabel={stat.a11y}
          padding={3}
          gap={1}
          style={styles.tile}
        >
          <Icon name={stat.icon} size={STAT_ICON_SIZE} />
          <AppText variant="title" weight="800">
            {stat.value}
          </AppText>
          <AppText variant="micro" tone="muted" style={styles.label}>
            {stat.label}
          </AppText>
        </Surface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
  tile: { flex: 1, alignItems: 'center' },
  label: { textAlign: 'center' },
});
