# 0002 — Arquitetura hexagonal leve com quatro camadas

## Status

Aceito

## Contexto

O motor de recomendação e a gamificação precisam de 100 % de cobertura e devem continuar
testáveis sem React Native nem rede. O app também precisa trocar de fonte de dados (Open-
Meteo direto vs. BFF, ver ADR 0006) sem reescrever telas. Um app deste tamanho não justifica
um framework de injeção de dependência.

## Decisão

Quatro camadas em `apps/mobile/src`: `domain` (regras puras, zero dependências),
`application` (casos de uso + ports em `application/ports`, depende só de `domain`),
`infrastructure` (um adapter por port, depende de `domain` e `application`) e
`presentation` (Expo Router, TanStack Query, Zustand). As regras de dependência são
impostas por `eslint-plugin-boundaries` em `apps/mobile/eslint.config.js`
(`boundaries/dependencies`): `domain` não importa nada de fora; `application` só importa
`domain`; `infrastructure` importa `domain` e `application`; `presentation` importa
`domain` e `application` e só recebe `infrastructure` pelo container via Context
(`ServicesProvider`/`useServices`). A composição (escolher os adapters concretos e montar os
casos de uso) acontece uma única vez em `infrastructure/container.ts`
(`createServices`/`selectAdapters`), chamado a partir de `app/_layout.tsx`.

## Consequências

Custo: mais arquivos pequenos (uma interface em `ports/`, um adapter em `infrastructure/`)
onde uma chamada direta a `fetch` na tela resolveria mais rápido. Benefício: trocar Open-
Meteo direto por BFF é trocar um adapter (`selectAdapters`), sem tocar `domain` nem
`presentation`; o lint falha a build (`pnpm --filter mobile lint`) se alguém importar
`infrastructure` fora do container; testes de `domain` e `application` usam ports falsos
sem nenhum mock de rede.
