import { Pressable, StyleSheet, View } from 'react-native';

import type { City } from '@/application/ports';
import type { LevelProgress, LocalDateTime } from '@/domain';

import { formatLongDate } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Icon, Surface, tokens } from '../../../ui';

import { LevelOrb } from './LevelOrb';

type Props = {
  readonly city: City;
  readonly now: LocalDateTime;
  readonly level: LevelProgress;
  readonly onOpenCities: () => void;
};

/** "Campinas, São Paulo"; quando o estado repete o nome (capitais) ou falta, usa o país. */
export function cityLabelOf(city: City): string {
  const region = city.admin1 && city.admin1 !== city.name ? city.admin1 : city.country;
  return region ? `${city.name}, ${region}` : city.name;
}

export function HomeHeader({ city, now, level, onOpenCities }: Props) {
  const cityLabel = cityLabelOf(city);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        onPress={onOpenCities}
        style={({ pressed }) => [styles.cityButton, pressed ? styles.pressed : null]}
      >
        <View style={styles.cityLine}>
          <AppText variant="subtitle" weight="700">
            {cityLabel}
          </AppText>
          <Icon name="caret" size={CARET_SIZE} color={tokens.color.textMuted} />
        </View>
        <AppText variant="small" tone="muted">
          {`${formatLongDate(now.date)} · ${now.hour}h`}
        </AppText>
      </Pressable>
      <Surface strength="soft" radius="pill" padding={2} gap={2} style={styles.levelPill}>
        <LevelOrb level={level.level} name={level.name} progress={level.progress} />
        <View>
          <AppText variant="micro" tone="muted">
            {t.level.short(level.level)}
          </AppText>
          <AppText variant="small" weight="700">
            {level.name}
          </AppText>
        </View>
      </Surface>
    </View>
  );
}

const CARET_SIZE = 16;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  // 44pt: era o único controle do app abaixo do mínimo de toque, com 34 de altura.
  cityButton: { flexShrink: 1, minHeight: tokens.size.minTouch, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  cityLine: { flexDirection: 'row', alignItems: 'center' },
  levelPill: { flexDirection: 'row', alignItems: 'center' },
});
