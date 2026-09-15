# Melhor Hora

App React Native (Expo) que transforma a previsão da Open-Meteo em uma recomendação simples:
o melhor horário do dia para uma atividade ao ar livre, com gamificação para criar o hábito.

## Estado

Plano 3 concluído: interface "Céu vivo" (gradiente por fase do dia, cartão-herói, linha do dia com
arco do sol, próximos dias, Perfil com calendário e conquistas, Cidades com bandeiras), rota
`/day/[date]` com planejamento de amanhã, seletor de hora no registro livre, animações com
Reanimated respeitando `useReducedMotion`, e um teste de tela ponta a ponta com MSW contra os
adapters reais da Open-Meteo. O BFF com cache (Plano 4) vem a seguir.

No app, veja: Hoje (herói com anel de nível, faixa de streak, linha horária, próximos dias),
Cidades (busca, favoritas/recentes, bandeiras), Perfil (nível, calendário do mês, conquistas com
progresso, histórico), e o detalhe de um dia futuro em `/day/[date]`.

## Rodar

```bash
pnpm install
pnpm --filter mobile start   # QR code para o Expo Go (iOS/Android)
pnpm test                    # testes com cobertura (domínio 100 %)
pnpm lint && pnpm typecheck
```

Variáveis de ambiente (opcionais, `apps/mobile/.env`): `EXPO_PUBLIC_API_MODE=direct|bff`,
`EXPO_PUBLIC_BFF_URL`, `EXPO_PUBLIC_ASSETS_URL`. Sem nada configurado, o app usa a Open-Meteo direto.

Smoke manual no Expo Go pendente (não executado por automação): roteiro completo em
`docs/superpowers/plans/2026-09-14-plano-3-pendencias.md`.

## Design

- `src/presentation/ui/tokens.ts` reúne o design system: espaçamento (múltiplos de 4), raios,
  tipografia e os gradientes de cada fase do céu — nada de cor/raio/espaço hardcoded nas telas.
- `src/presentation/ui/Sky.tsx` + `skyPhase.ts` escolhem e animam (crossfade) o gradiente de fundo
  por fase (`dawn`, `day`, `dusk`, `night`, `rainy`) a partir do horário local e da previsão do dia.
- Primitivos (`Surface`, `Button`, `Chip`, `Pill`, `SectionHeader`, `Emoji`, `CountUp`, `Reveal`,
  `LevelBar`) compõem as telas por cima do céu; toda animação passa por `useReducedMotion()`.
- Referência visual: `docs/superpowers/mockups/home-rich-v3.html` e `visual-direction.html`; spec
  completa em `docs/superpowers/specs/2026-09-13-melhor-hora-design.md` (seções 3.2, 3.3, 3.5, 4.5, 5.5).

## Arquitetura

- `src/domain` — regras puras (motor de recomendação e gamificação), 100 % testadas.
- `src/application` — ports (interfaces) e casos de uso que devolvem `Result` (ou degradam com log quando o storage falha).
- `src/infrastructure` — adapters: Open-Meteo (Zod), AsyncStorage, expo-location, expo-notifications, relógio, ids, logger; `container.ts` monta tudo.
- `src/presentation` — TanStack Query, Zustand persistido, design system (`ui/`) e telas por feature; `src/app` só re-exporta telas para o Expo Router; `_layout.tsx` compõe o container e configura notificações.
- Testes de tela usam serviços falsos (`application/testing/fakes.ts`); `HomeScreen.msw.test.tsx`
  é a exceção deliberada — roda os adapters reais do Open-Meteo por trás do MSW (`msw/node`).
