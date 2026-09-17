import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Icon, Surface, tokens } from '../../../ui';
import type { NextBadge } from '../nextBadge';

const PERCENT = 100;
const MEDAL = 44;
const TRACK_HEIGHT = 8;

/**
 * A conquista mais perto de sair, promovida acima do calendário.
 *
 * A hierarquia do Perfil estava invertida: o calendário era o maior elemento da tela e carregava a
 * menor quantidade de informação, enquanto a coleção de conquistas — que é a razão de voltar —
 * ficava numa grade de medalhas iguais no fim. Isto põe a meta mais próxima em primeiro plano,
 * com o quanto falta visível.
 */
export function NextBadgeCard({ next }: { readonly next: NextBadge }) {
  const pct = Math.min(PERCENT, Math.round(next.ratio * PERCENT));
  const remaining = Math.max(0, next.target - next.current);
  return (
    <Surface
      accessibilityLabel={t.profile.nextBadgeAria(
        t.badges[next.badge.id],
        next.current,
        next.target,
      )}
      strength="strong"
      radius="card"
      padding={4}
      gap={3}
      style={styles.card}
    >
      <View style={styles.head}>
        <View style={styles.medal}>
          <Icon name="medal" size={MEDAL_ICON} color={tokens.color.gold} />
        </View>
        <View style={styles.headText}>
          <AppText variant="kicker" style={styles.kicker}>
            {t.profile.nextBadgeKicker}
          </AppText>
          <AppText variant="subtitle" weight="700">
            {t.badges[next.badge.id]}
          </AppText>
          <AppText variant="small" tone="muted">
            {t.profile.nextBadgeRemaining(remaining)}
          </AppText>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </Surface>
  );
}

const MEDAL_ICON = 26;

const styles = StyleSheet.create({
  card: { borderLeftWidth: 3, borderLeftColor: tokens.color.gold },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  medal: {
    width: MEDAL,
    height: MEDAL,
    borderRadius: MEDAL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.shade,
    borderWidth: 2,
    borderColor: tokens.color.goldBorder,
  },
  headText: { flex: 1, gap: tokens.space[1] },
  kicker: { color: tokens.color.gold },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.shade,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.gold,
  },
});
