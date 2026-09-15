import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { City } from '@/application/ports';

import { t } from '../../i18n/pt-BR';
import { useCitySearch } from '../../queries/useCitySearch';
import { useServices } from '../../services/ServicesProvider';
import { isFavorite } from '../../state/preferences';
import { usePreferences } from '../../state/preferencesStore';
import { Sky } from '../../ui';

import { CitiesHeader, searchStateMessage } from './components/CitiesHeader';
import { CityResults } from './components/CityResults';
import { CitySkeleton } from './components/CitySkeleton';

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

  return (
    <Sky phase="night">
      <SafeAreaView style={styles.safe}>
        <CitiesHeader
          query={query}
          onChangeQuery={setQuery}
          onUseLocation={() => void resolveLocation()}
          onRetry={search.retry}
          locationError={locationError}
          message={searchStateMessage(query, search)}
        />
        {search.isSearching ? (
          <CitySkeleton />
        ) : (
          <CityResults
            results={search.results}
            favorites={favorites}
            recents={recents}
            isFavorite={(city) => isFavorite(favorites, city)}
            onSelect={choose}
            onToggleFavorite={toggleFav}
          />
        )}
      </SafeAreaView>
    </Sky>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
