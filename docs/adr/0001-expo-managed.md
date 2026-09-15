# 0001 — Expo managed workflow, Expo Go como alvo do avaliador

## Status

Aceito

## Contexto

O teste técnico pede um app React Native avaliado por terceiros a partir do link do
repositório, com prazo de uma semana e meia. Nenhum requisito do teste pede módulo nativo
sob medida, e quem avalia não deve precisar instalar Xcode, Android Studio ou gerar um build
para ver o app funcionando.

## Decisão

O app usa o Expo managed workflow (SDK atual, Expo Router) e tem o **Expo Go** como alvo
oficial de avaliação: `pnpm --filter mobile start` gera um QR code que abre o app em
qualquer aparelho com o Expo Go instalado, sem configurar nada. Todos os módulos nativos
usados (`expo-location`, `expo-notifications`, `react-native-reanimated`,
`@react-native-async-storage/async-storage`) são suportados pelo Expo Go; não há nenhum
plugin de config nativo customizado em `app.json`.

## Consequências

Custo: se algum requisito futuro precisar de um módulo nativo sem suporte no Expo Go, seria
necessário migrar para um dev client (`expo-dev-client`) ou prebuild — fora de escopo hoje.
Benefício: zero setup para o avaliador, ciclo de iteração rápido (hot reload no aparelho
real) e nenhuma dependência de conta Apple/Google para rodar. EAS Build (APK de preview) e
EAS Update (OTA) ficam como itens opcionais (spec seção 2), só se sobrar tempo.
