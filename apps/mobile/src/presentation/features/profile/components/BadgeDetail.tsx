import type { BadgeState } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, Surface } from '../../../ui';

type Props = {
  readonly badge: BadgeState;
};

function criterionLabel(badge: BadgeState): string | null {
  if (badge.unlocked || badge.progress === null) return null;
  if (badge.id === 'week')
    return t.profile.bestStreak(badge.progress.current, badge.progress.target);
  return `${badge.progress.current}/${badge.progress.target}`;
}

/** Detalhe inline de uma conquista: nome, descrição e, se bloqueada, o critério de progresso. */
export function BadgeDetail({ badge }: Props) {
  const criterion = criterionLabel(badge);
  return (
    <Surface radius="card" padding={3} gap={1}>
      <AppText variant="subtitle">{t.badges[badge.id]}</AppText>
      <AppText variant="small" tone="muted">
        {t.badgeDescription[badge.id]}
      </AppText>
      {criterion !== null ? (
        <AppText variant="small" weight="700">
          {criterion}
        </AppText>
      ) : null}
    </Surface>
  );
}
