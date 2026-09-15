import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { BadgeId, BadgeState } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, tokens } from '../../../ui';

import { BadgeDetail } from './BadgeDetail';

type Props = {
  readonly badges: readonly BadgeState[];
};

const stateLabel = (unlocked: boolean): string => (unlocked ? 'desbloqueada' : 'bloqueada');

function accessibilityLabel(badge: BadgeState): string {
  const base = `${t.badges[badge.id]}: ${stateLabel(badge.unlocked)}`;
  if (badge.unlocked || badge.progress === null) return base;
  return `${base}, ${t.profile.badgeProgress(badge.progress.current, badge.progress.target)}`;
}

function BadgeIcon({ badge }: { readonly badge: BadgeState }) {
  return (
    <View style={[styles.icon, badge.unlocked ? styles.unlocked : styles.locked]}>
      <Emoji
        symbol={t.badgeEmoji[badge.id]}
        size={tokens.size.badgeGlyph}
        label={t.badges[badge.id]}
      />
    </View>
  );
}

type ItemProps = {
  readonly badge: BadgeState;
  readonly selected: boolean;
  readonly onPress: () => void;
};

function BadgeItem({ badge, selected, onPress }: ItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel(badge)}
      onPress={onPress}
      style={[styles.item, selected ? styles.selected : null]}
    >
      <BadgeIcon badge={badge} />
      <AppText
        variant="micro"
        weight="700"
        tone={badge.unlocked ? 'default' : 'muted'}
        style={styles.label}
      >
        {t.badges[badge.id]}
      </AppText>
      {!badge.unlocked && badge.progress !== null ? (
        <AppText variant="micro" tone="muted">
          {`${badge.progress.current}/${badge.progress.target}`}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** Grade 4x colunas de conquistas; tocar alterna o `BadgeDetail` inline abaixo da grade. */
export function BadgeGrid({ badges }: Props) {
  const [selectedId, setSelectedId] = useState<BadgeId | null>(null);
  const selected = badges.find((b) => b.id === selectedId) ?? null;
  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {badges.map((badge) => (
          <BadgeItem
            key={badge.id}
            badge={badge}
            selected={badge.id === selectedId}
            onPress={() => setSelectedId((current) => (current === badge.id ? null : badge.id))}
          />
        ))}
      </View>
      {selected !== null ? <BadgeDetail badge={selected} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[3] },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: tokens.space[3],
  },
  item: { width: '22%', alignItems: 'center', gap: tokens.space[1] },
  selected: { backgroundColor: tokens.color.surface, borderRadius: tokens.radius.card },
  icon: {
    width: tokens.size.badgeBox,
    height: tokens.size.badgeBox,
    borderRadius: tokens.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  unlocked: { backgroundColor: tokens.color.gold, borderColor: tokens.color.gold },
  // Bloqueada: a superfície apagada e o rótulo suave já distinguem o estado; o glifo fica em
  // opacidade cheia para continuar legível (o `opacity: 0.35` anterior o apagava junto).
  locked: { backgroundColor: tokens.color.surface, borderColor: tokens.color.border },
  label: { textAlign: 'center' },
});
