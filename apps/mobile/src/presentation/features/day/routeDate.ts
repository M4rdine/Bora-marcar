/**
 * Data da rota `/day/[date]` a partir de `useLocalSearchParams()`.
 *
 * Os tipos de rota do Expo Router são gerados em `.expo/types` por `expo start`; no CI (e num
 * clone novo) esses arquivos não existem, então o parâmetro chega como `string | string[] |
 * undefined`. Normalizar aqui deixa a tela independente de artefato gerado e cobre os casos reais
 * de um parâmetro repetido (`?date=a&date=b`) ou ausente.
 */
export function routeDate(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ?? '';
}
