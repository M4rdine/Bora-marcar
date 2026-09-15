import { StyleSheet, View } from 'react-native';

import { defaultEngineConfig, type LevelProgress } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, LevelBar, Surface, tokens } from '../../../ui';
import { LevelOrb } from '../../home/components/LevelOrb';

type Props = {
  readonly level: LevelProgress;
};

const nextLevelName = (level: number): string =>
  defaultEngineConfig.levels.find((x) => x.level === level + 1)?.name ?? '';

/** Cartão de nível do Perfil: orb grande, nome/XP e a barra de progresso até o próximo nível. */
export function LevelCard({ level }: Props) {
  const rightLabel =
    level.nextLevelXp === null
      ? t.profile.maxLevel
      : t.profile.xpToNext(level.xpToNext ?? 0, nextLevelName(level.level));

  return (
    <Surface strength="strong" radius="hero" padding={4} gap={3}>
      <View style={styles.row}>
        <LevelOrb
          level={level.level}
          name={level.name}
          progress={level.progress}
          size={tokens.size.orbLarge}
        />
        <View style={styles.info}>
          <AppText variant="title">{t.profile.level(level.level, level.name)}</AppText>
          <AppText variant="subtitle" tone="muted">
            {t.profile.xp(level.totalXp)}
          </AppText>
        </View>
      </View>
      <LevelBar progress={level.progress} left={t.profile.xp(level.totalXp)} right={rightLabel} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  info: { gap: tokens.space[1] },
});
