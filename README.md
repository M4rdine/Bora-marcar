# Melhor Hora

App React Native (Expo) que transforma a previsão da Open-Meteo em uma recomendação simples:
o melhor horário do dia para uma atividade ao ar livre, com gamificação para criar o hábito.

## Estado

Plano 1 concluído: monorepo, tooling e domínio (motor de recomendação e gamificação) com
100 % de cobertura. As telas, a integração com a API e o BFF vêm nos próximos planos.

## Rodar

```bash
pnpm install
pnpm --filter mobile start   # QR code para o Expo Go
pnpm test                    # testes com cobertura
pnpm lint && pnpm typecheck
```

## Estrutura

- `apps/mobile/src/domain` — regras puras, sem React: `recommendation/` (score por hora,
  janela, frase, dicas) e `gamification/` (eventos, XP, níveis, streak, badges).
- Documentação de design: `docs/superpowers/specs/2026-09-13-melhor-hora-design.md`.
