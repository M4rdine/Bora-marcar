import { Pressable, StyleSheet, View } from 'react-native';

import type { City } from '@/application/ports';

import { countryFlag } from '../../../i18n/countryFlag';
import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, Icon, Surface, tokens } from '../../../ui';

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

/**
 * Selecionar a cidade e favoritar são dois botões IRMÃOS dentro da superfície da linha (nunca
 * aninhados): um leitor de tela precisa focar e acionar cada um separadamente.
 */
export function CityRow({ city, favorite, onSelect, onToggleFavorite }: Props) {
  return (
    <Surface strength="soft" radius="card" padding={3} style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cityLabel(city)}
        onPress={onSelect}
        style={({ pressed }) => [styles.main, pressed ? styles.pressed : null]}
      >
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
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? t.cities.unfavorite : t.cities.favorite}
        onPress={onToggleFavorite}
        style={({ pressed }) => [styles.favorite, pressed ? styles.pressed : null]}
      >
        <Icon name={favorite ? 'starFilled' : 'star'} size={ICON_SIZE} color={tokens.color.text} />
      </Pressable>
    </Surface>
  );
}

const ICON_SIZE = 22;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  main: {
    flex: 1,
    minHeight: tokens.size.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  info: { flex: 1, gap: tokens.space[1] },
  // 44pt é o mínimo de alvo de toque da Apple; a caixa visível é menor, a de toque não.
  favorite: {
    minWidth: tokens.size.minTouch,
    minHeight: tokens.size.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
