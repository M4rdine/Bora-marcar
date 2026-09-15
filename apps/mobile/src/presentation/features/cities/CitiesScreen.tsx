import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { City } from '@/application/ports';

import { t } from '../../i18n/pt-BR';
import { useCitySearch } from '../../queries/useCitySearch';
import { useServices } from '../../services/ServicesProvider';
import { isFavorite } from '../../state/preferences';
import { usePreferences } from '../../state/preferencesStore';
import { AppText, Button, Sky, Surface, tokens } from '../../ui';

import { CityRow } from './components/CityRow';
import { CitySection } from './components/CitySection';
import { SearchField } from './components/SearchField';

type Search = ReturnType<typeof useCitySearch>;
type StateMessage = { readonly text: string; readonly danger: boolean };

function searchStateMessage(query: string, search: Search): StateMessage | null {
  if (!search.isActive) return { text: t.cities.hint, danger: false };
  if (search.isSearching) return { text: t.cities.searching, danger: false };
  if (search.error) return { text: t.errors[search.error.code], danger: true };
  if (search.results.length === 0) return { text: t.cities.noResults(query.trim()), danger: false };
  return null;
}

function StateBanner({ message }: { readonly message: StateMessage }) {
  return (
    <Surface strength="soft" radius="card" padding={3}>
      <AppText variant="small" tone="muted" style={message.danger ? styles.error : undefined}>
        {message.text}
      </AppText>
    </Surface>
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
  const toggleFav = usePreferences((s) => s.toggleFavorite);

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

  const message = searchStateMessage(query, search);
  const cityIsFavorite = (city: City): boolean => isFavorite(favorites, city);

  return (
    <Sky phase="night">
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <SearchField value={query} onChangeText={setQuery} />
          <Button kind="quiet" label={t.home.useLocation} onPress={() => void resolveLocation()} />
          {locationError ? (
            <AppText variant="small" style={styles.error}>
              {locationError}
            </AppText>
          ) : null}
          {message ? <StateBanner message={message} /> : null}
        </View>
        <FlatList
          data={search.results}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <CityRow
              city={item}
              favorite={cityIsFavorite(item)}
              onSelect={() => choose(item)}
              onToggleFavorite={() => toggleFav(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          ListFooterComponent={
            <>
              <CitySection
                title={t.cities.favorites}
                cities={favorites}
                isFavorite={cityIsFavorite}
                onSelect={choose}
                onToggleFavorite={toggleFav}
              />
              <CitySection
                title={t.cities.recents}
                cities={recents}
                isFavorite={cityIsFavorite}
                onSelect={choose}
                onToggleFavorite={toggleFav}
              />
            </>
          }
        />
      </SafeAreaView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: tokens.space[4], gap: tokens.space[3] },
  list: { paddingHorizontal: tokens.space[4], paddingBottom: tokens.space[6] },
  gap: { height: tokens.space[2] },
  error: { color: tokens.color.danger },
});
