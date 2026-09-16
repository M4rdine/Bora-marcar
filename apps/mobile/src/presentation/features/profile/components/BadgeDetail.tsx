import { StyleSheet, View } from 'react-native';

import type { BadgeState } from '@/domain';

import { formatLongDate } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Surface, tokens } from '../../../ui';

type Props = {
  readonly badge: BadgeState;
};

const PERCENT = 100;

/** A conquista de semana mede a MELHOR sequência já feita, não a atual: o rótulo precisa dizer. */
function progressLabel(badge: BadgeState, progress: NonNullable<BadgeState['progress']>): string {
  return badge.id === 'week'
    ? t.profile.bestStreak(progress.current, progress.target)
    : t.profile.badgeProgress(progress.current, progress.target);
}

/**
 * Quanto falta, em barra e em número. A fração sozinha ("2/5") diz o critério, mas não mostra a
 * distância; a barra mostra, e é ela que faz a conquista parecer alcançável.
 */
function Progress({
  current,
  target,
  label,
}: {
  readonly current: number;
  readonly target: number;
  readonly label: string;
}) {
  const pct = Math.min(PERCENT, Math.round((current / target) * PERCENT));
  return (
    <View
      accessible
      accessibilityLabel={t.profile.badgeProgressAria(current, target, pct)}
      style={styles.progress}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
      <AppText variant="small" weight="700">
        {label}
      </AppText>
    </View>
  );
}

/** Detalhe inline de uma conquista: nome, descrição e, se bloqueada, o quanto já andou. */
export function BadgeDetail({ badge }: Props) {
  return (
    <Surface radius="card" padding={3} gap={2}>
      <AppText variant="subtitle">{t.badges[badge.id]}</AppText>
      <AppText variant="small" tone="muted">
        {t.badgeDescription[badge.id]}
      </AppText>
      {badge.unlocked ? (
        <AppText variant="small" weight="700" style={styles.done}>
          {badge.unlockedOn
            ? t.unlock.earnedOn(formatLongDate(badge.unlockedOn))
            : t.profile.badgeDone}
        </AppText>
      ) : null}
      {!badge.unlocked && badge.progress !== null ? (
        <Progress
          current={badge.progress.current}
          target={badge.progress.target}
          label={progressLabel(badge, badge.progress)}
        />
      ) : null}
    </Surface>
  );
}

const TRACK_HEIGHT = 8;

const styles = StyleSheet.create({
  progress: { gap: tokens.space[1] },
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
  done: { color: tokens.color.mint },
});
