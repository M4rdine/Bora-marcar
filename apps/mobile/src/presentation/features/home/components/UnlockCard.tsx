import { StyleSheet } from 'react-native';

import type { BadgeState } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, Surface, tokens } from '../../../ui';

export function UnlockCard({ badge }: { readonly badge: BadgeState }) {
  return (
    <Surface radius="card" padding={3} gap={1} style={styles.card}>
      <Emoji
        symbol={t.badgeEmoji[badge.id]}
        size={tokens.size.badgeIcon}
        label={t.badges[badge.id]}
      />
      <AppText variant="micro" weight="800">
        {t.unlock.kicker}
      </AppText>
      <AppText variant="subtitle">{t.badges[badge.id]}</AppText>
      <AppText variant="small" tone="muted">
        {t.badgeDescription[badge.id]}
      </AppText>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.color.goldSoft,
    borderColor: tokens.color.goldBorder,
    borderWidth: 1,
  },
});
