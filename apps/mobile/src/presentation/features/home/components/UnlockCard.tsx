import { StyleSheet, View } from 'react-native';

import type { BadgeState } from '@/domain';

import { formatLongDate } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, tokens } from '../../../ui';

type Props = {
  readonly badge: BadgeState;
  /** Quantas conquistas a pessoa tem agora, e de quantas. Dá posição ao que ela acabou de fazer. */
  readonly unlockedCount: number;
  readonly total: number;
};

/**
 * Uma conquista precisa parecer registro do que a pessoa fez, não adesivo colado na tela. Por isso
 * o cartão leva o critério cumprido, a data e a posição na coleção: fatos, não comemoração.
 */
export function UnlockCard({ badge, unlockedCount, total }: Props) {
  return (
    <View
      accessible
      accessibilityLabel={`${t.unlock.kicker}: ${t.badges[badge.id]}, ${t.unlock.count(unlockedCount, total)}`}
      style={styles.card}
    >
      <View style={styles.medal}>
        <Emoji
          symbol={t.badgeEmoji[badge.id]}
          size={tokens.size.badgeIcon}
          label={t.badges[badge.id]}
        />
      </View>
      <View style={styles.body}>
        <AppText variant="micro" weight="800" style={styles.kicker}>
          {t.unlock.kicker}
        </AppText>
        <AppText variant="subtitle" weight="700">
          {t.badges[badge.id]}
        </AppText>
        <AppText variant="small" tone="muted">
          {t.badgeDescription[badge.id]}
        </AppText>
        <View style={styles.footer}>
          <AppText variant="micro" weight="700" style={styles.ordinal}>
            {t.unlock.count(unlockedCount, total)}
          </AppText>
          {badge.unlockedOn ? (
            <AppText variant="micro" tone="muted">
              {t.unlock.earnedOn(formatLongDate(badge.unlockedOn))}
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const MEDAL_SIZE = 56;

const styles = StyleSheet.create({
  // Deitado e com medalha à esquerda: um objeto distinto dos cartões da tela, não mais um deles.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.card,
    backgroundColor: tokens.color.goldSoft,
    borderLeftWidth: 3,
    borderLeftColor: tokens.color.gold,
  },
  medal: {
    width: MEDAL_SIZE,
    height: MEDAL_SIZE,
    borderRadius: MEDAL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.shade,
    borderWidth: 2,
    borderColor: tokens.color.goldBorder,
  },
  body: { flex: 1, gap: tokens.space[1] },
  kicker: { color: tokens.color.gold },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2], alignItems: 'baseline' },
  ordinal: { color: tokens.color.gold },
});
