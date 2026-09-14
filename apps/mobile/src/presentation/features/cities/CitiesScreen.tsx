import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { City } from '@/application/ports';

import { t } from '../../i18n/pt-BR';
import { useCitySearch } from '../../queries/useCitySearch';
import { useServices } from '../../services/ServicesProvider';
import { isFavorite } from '../../state/preferences';
import { usePreferences } from '../../state/preferencesStore';

const cityLabel = (c: City): string =>
  [c.name, c.admin1, c.country].filter((x): x is string => Boolean(x)).join(', ');

function CityRow({
  city,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  city: City;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" onPress={onSelect} style={styles.rowMain}>
        <Text>{cityLabel(city)}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? t.cities.unfavorite : t.cities.favorite}
        onPress={onToggleFavorite}
      >
        <Text>{favorite ? '★' : '☆'}</Text>
      </Pressable>
    </View>
  );
}

export function CitiesScreen() {
  const router = useRouter();
  const services = useServices();
  const [query, setQuery] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const search = useCitySearch(query);
  const favorites = usePreferences((s) => s.favorites);
  const recents = usePreferences((s) => s.recents);
  const selectCity = usePreferences((s) => s.selectCity);
  const toggleFavorite = usePreferences((s) => s.toggleFavorite);

  const choose = (city: City) => {
    selectCity(city);
    router.push('/');
  };
  const resolveLocation = async () => {
    setLocationError(null);
    const r = await services.resolveMyLocation();
    if (r.ok) choose(r.value);
    else setLocationError(t.errors[r.error.code]);
  };

  const section = (title: string, cities: readonly City[]) =>
    cities.length === 0 ? null : (
      <View>
        <Text style={styles.section}>{title}</Text>
        {cities.map((c) => (
          <CityRow
            key={c.id}
            city={c}
            favorite={isFavorite(favorites, c)}
            onSelect={() => choose(c)}
            onToggleFavorite={() => toggleFavorite(c)}
          />
        ))}
      </View>
    );

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel={t.cities.placeholder}
        placeholder={t.cities.placeholder}
        value={query}
        onChangeText={setQuery}
        style={styles.input}
        autoCorrect={false}
      />
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => void resolveLocation()}
      >
        <Text style={styles.buttonText}>{t.home.useLocation}</Text>
      </Pressable>
      {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
      {!search.isActive ? <Text>{t.cities.hint}</Text> : null}
      {search.isSearching ? <Text>{t.cities.searching}</Text> : null}
      {search.error ? <Text style={styles.error}>{t.errors[search.error.code]}</Text> : null}
      {search.isActive && !search.isSearching && !search.error && search.results.length === 0 ? (
        <Text>{t.cities.noResults(query.trim())}</Text>
      ) : null}
      <FlatList
        data={search.results}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CityRow
            city={item}
            favorite={isFavorite(favorites, item)}
            onSelect={() => choose(item)}
            onToggleFavorite={() => toggleFavorite(item)}
          />
        )}
        ListFooterComponent={
          <>
            {section(t.cities.favorites, favorites)}
            {section(t.cities.recents, recents)}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 12 },
  button: { padding: 12, borderRadius: 12, backgroundColor: '#333', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowMain: { flex: 1 },
  section: { fontWeight: '700', marginTop: 16 },
  error: { color: '#b00020' },
});
