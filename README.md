# Melhor Hora

App React Native (Expo) que transforma a previsão da Open-Meteo em uma recomendação simples:
o melhor horário do dia para uma atividade ao ar livre, com gamificação para criar o hábito.

## Estado

Plano 2 concluído: o app funciona de ponta a ponta no Expo Go em modo `direct` (Open-Meteo direto),
com telas funcionais em texto. O visual "Céu vivo" (Plano 3) e o BFF com cache (Plano 4) vêm a seguir.

## Rodar

```bash
pnpm install
pnpm --filter mobile start   # QR code para o Expo Go (iOS/Android)
pnpm test                    # testes com cobertura (domínio 100 %)
pnpm lint && pnpm typecheck
```

Variáveis de ambiente (opcionais, `apps/mobile/.env`): `EXPO_PUBLIC_API_MODE=direct|bff`,
`EXPO_PUBLIC_BFF_URL`, `EXPO_PUBLIC_ASSETS_URL`. Sem nada configurado, o app usa a Open-Meteo direto.

Smoke manual no Expo Go pendente: ver roteiro em docs/superpowers/plans/2026-09-14-plano-2-pendencias.md.

## Arquitetura

- `src/domain` — regras puras (motor de recomendação e gamificação), 100 % testadas.
- `src/application` — ports (interfaces) e casos de uso que devolvem `Result` (ou degradam com log quando o storage falha).
- `src/infrastructure` — adapters: Open-Meteo (Zod), AsyncStorage, expo-location, expo-notifications, relógio, ids, logger; `container.ts` monta tudo.
- `src/presentation` — TanStack Query, Zustand persistido, telas por feature; `src/app` só re-exporta telas para o Expo Router; `_layout.tsx` compõe o container e configura notificações.
- Documentação de design: `docs/superpowers/specs/2026-09-13-melhor-hora-design.md`.
