import { Pressable, StyleSheet, View } from 'react-native';

import type { City } from '@/application/ports';

import { countryFlag } from '../../../i18n/countryFlag';
import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, Surface, tokens } from '../../../ui';

export const cityLabel = (city: City): string =>
  [city.name, city.admin1, city.country].filter((x): x is string => Boolean(x)).join(', ');

const cityDetail = (city: City): string =>
  [city.admin1, city.country].filter((x): x is string => Boolean(x)).join(', ');

type Props = {
  readonly city: City;
  readonly favorite: boolean;
  readonly onSelect: () => void;
  readonly onToggleFavorite: () => void;
};

export function CityRow({ city, favorite, onSelect, onToggleFavorite }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={cityLabel(city)} onPress={onSelect}>
      <Surface strength="soft" radius="card" padding={3} style={styles.row}>
        <Emoji
          symbol={countryFlag(city.countryCode)}
          size={tokens.size.flag}
          label={t.cities.flag(city.country)}
        />
        <View style={styles.info}>
          <AppText variant="subtitle">{city.name}</AppText>
          <AppText variant="small" tone="muted">
            {cityDetail(city)}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? t.cities.unfavorite : t.cities.favorite}
          onPress={onToggleFavorite}
          hitSlop={tokens.space[2]}
        >
          <AppText variant="title">{favorite ? '★' : '☆'}</AppText>
        </Pressable>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  info: { flex: 1, gap: tokens.space[1] },
});
