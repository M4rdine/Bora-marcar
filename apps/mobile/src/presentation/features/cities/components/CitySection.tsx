import { StyleSheet, View } from 'react-native';

import type { City } from '@/application/ports';

import { SectionHeader, tokens } from '../../../ui';

import { CityRow } from './CityRow';

type Props = {
  readonly title: string;
  readonly cities: readonly City[];
  readonly isFavorite: (city: City) => boolean;
  readonly onSelect: (city: City) => void;
  readonly onToggleFavorite: (city: City) => void;
};

export function CitySection({ title, cities, isFavorite, onSelect, onToggleFavorite }: Props) {
  if (cities.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {cities.map((city) => (
        <CityRow
          key={city.id}
          city={city}
          favorite={isFavorite(city)}
          onSelect={() => onSelect(city)}
          onToggleFavorite={() => onToggleFavorite(city)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[2], marginTop: tokens.space[4] },
});
