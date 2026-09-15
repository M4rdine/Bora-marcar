import { FlatList, StyleSheet, View } from 'react-native';

import type { City } from '@/application/ports';

import { t } from '../../../i18n/pt-BR';
import { screenPaddingBottom, tokens } from '../../../ui';

import { CityRow } from './CityRow';
import { CitySection } from './CitySection';

type Props = {
  readonly results: readonly City[];
  readonly favorites: readonly City[];
  readonly recents: readonly City[];
  readonly isFavorite: (city: City) => boolean;
  readonly onSelect: (city: City) => void;
  readonly onToggleFavorite: (city: City) => void;
};

export function CityResults({
  results,
  favorites,
  recents,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: Props) {
  return (
    <FlatList
      data={results}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <CityRow
          city={item}
          favorite={isFavorite(item)}
          onSelect={() => onSelect(item)}
          onToggleFavorite={() => onToggleFavorite(item)}
        />
      )}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListFooterComponent={
        <>
          <CitySection
            title={t.cities.favorites}
            cities={favorites}
            isFavorite={isFavorite}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
          />
          <CitySection
            title={t.cities.recents}
            cities={recents}
            isFavorite={isFavorite}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
          />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: tokens.space[4], paddingBottom: screenPaddingBottom },
  gap: { height: tokens.space[2] },
});
