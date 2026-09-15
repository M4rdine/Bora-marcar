import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import type { useCitySearch } from '../../../queries/useCitySearch';
import { AppText, Button, Surface, tokens } from '../../../ui';

import { SearchField } from './SearchField';

type Search = ReturnType<typeof useCitySearch>;
export type CitiesStateMessage = { readonly text: string; readonly danger: boolean };

/** Mensagem de estado da busca: dica, buscando, erro ou sem resultados (nesta ordem de prioridade). */
export function searchStateMessage(query: string, search: Search): CitiesStateMessage | null {
  if (!search.isActive) return { text: t.cities.hint, danger: false };
  if (search.isSearching) return { text: t.cities.searching, danger: false };
  if (search.error) return { text: t.errors[search.error.code], danger: true };
  if (search.results.length === 0) return { text: t.cities.noResults(query.trim()), danger: false };
  return null;
}

type Props = {
  readonly query: string;
  readonly onChangeQuery: (text: string) => void;
  readonly onUseLocation: () => void;
  readonly locationError: string | null;
  readonly message: CitiesStateMessage | null;
};

export function CitiesHeader({
  query,
  onChangeQuery,
  onUseLocation,
  locationError,
  message,
}: Props) {
  return (
    <View style={styles.header}>
      <SearchField value={query} onChangeText={onChangeQuery} />
      <Button kind="quiet" label={t.home.useLocation} onPress={onUseLocation} />
      {locationError ? (
        <AppText variant="small" style={styles.error}>
          {locationError}
        </AppText>
      ) : null}
      {message ? (
        <Surface strength="soft" radius="card" padding={3}>
          <AppText variant="small" tone="muted" style={message.danger ? styles.error : undefined}>
            {message.text}
          </AppText>
        </Surface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: tokens.space[4], gap: tokens.space[3] },
  error: { color: tokens.color.danger },
});
