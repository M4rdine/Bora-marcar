# Melhor Hora — Design do produto e da arquitetura

Data: 2026-09-13
Status: aprovado em brainstorming, aguardando revisão final do spec
Origem: Teste Técnico React Native (PDF em `~/Downloads/Teste Técnico React Native.pdf`)

## 1. Contexto e objetivo

O teste pede um app React Native que consome a API pública da Open-Meteo e transforma
dados de clima em uma recomendação simples: **o melhor horário do dia para uma atividade
ao ar livre**. Requisitos mínimos: buscar cidade por nome, exibir resultados, consultar a
previsão da cidade escolhida. Critérios: clareza da experiência, simplicidade e elegância da
interface, qualidade da integração com a API, organização do código, capacidade de
transformar dado bruto em experiência útil, boas decisões de UX em app pequeno.

Entrega exigida: link do repositório, instruções para rodar, breve explicação das decisões,
breve descrição da lógica de recomendação.

Decisões de posicionamento tomadas no brainstorming:

- Prazo: uma semana e meia a partir de 2026-09-13.
- Três eixos de destaque: **interface que impressiona visualmente**, **motor de
  recomendação bom** e **gamificação de verdade** (não decorativa).
- Idioma PT-BR, Celsius, formato 24 h. Textos centralizados para i18n futura.
- Nome de trabalho: **Melhor Hora** (pode mudar; ver Questões em aberto).

## 2. Escopo

### Dentro

- Busca de cidade (Geocoding API), com recentes, favoritas e "usar minha localização".
- Seleção de atividade (5 perfis) e recomendação do melhor horário de hoje.
- Score de agora, linha do dia hora a hora, próximos 4 dias resumidos, comparativo
  "hoje vs. próximos dias", ressalvas de preparação.
- Ciclo de gamificação: planejar → lembrete → confirmar → XP → nível → badges → streak.
- Persistência local de cidade, atividade, favoritas, recentes e progresso.
- BFF com cache Redis, bucket MinIO com CDN, config remota do motor, fallback direto
  para a Open-Meteo.
- Testes unitários, de integração e E2E; CI; documentação de entrega.

### Fora (explicitamente)

- Contas de usuário, sincronização de progresso entre dispositivos, ranking social.
- Qualidade do ar e pólen (exigiria outra API; candidato a v2).
- Notificações push remotas (só notificações locais).
- Suporte a web como alvo oficial (pode funcionar, não é testado).

### Opcionais (fazer só se o núcleo estiver pronto antes do prazo)

- Melhor horário por atividade lado a lado ("Hoje: Corrida 7h, Praia 14h...").
- Selo de confiança da previsão por dia (alta para hoje e amanhã, média para dias 4–5).
- EAS Build com APK de preview e EAS Update para OTA.
- E2E Maestro no CI (exige runner macOS).

## 3. Produto

### 3.1 Atividades

Cinco perfis, definidos como **dados** (não código), carregados da config remota com cópia
embutida como fallback:

| Atividade  | Emoji | Faixa ideal (sensação °C) | Tolerância (°C) | Vento ok / máx (km/h) | UV ok / máx | Fator noturno |
|------------|-------|---------------------------|-----------------|------------------------|-------------|---------------|
| Caminhada  | 🚶    | 17–26                     | 8–33            | 20 / 45                | 5 / 9       | 0,7           |
| Corrida    | 🏃    | 12–21                     | 3–29            | 20 / 45                | 5 / 9       | 0,6           |
| Ciclismo   | 🚴    | 15–25                     | 6–32            | 15 / 35                | 5 / 9       | 0,3           |
| Praia      | 🏖    | 25–32                     | 20–38           | 15 / 35                | 6 / 10      | 0,0           |
| Piquenique | 🧺    | 19–27                     | 12–33           | 15 / 40                | 5 / 9       | 0,2           |

Pesos por fator (somam 1):

| Atividade  | Térmico | Chuva | Vento | UV   | Sol  |
|------------|---------|-------|-------|------|------|
| Caminhada  | 0,40    | 0,30  | 0,15  | 0,10 | 0,05 |
| Corrida    | 0,45    | 0,25  | 0,15  | 0,15 | 0,00 |
| Ciclismo   | 0,30    | 0,30  | 0,30  | 0,10 | 0,00 |
| Praia      | 0,30    | 0,25  | 0,15  | 0,10 | 0,20 |
| Piquenique | 0,35    | 0,35  | 0,15  | 0,05 | 0,10 |

### 3.2 Telas e navegação

Expo Router com **três abas** (Hoje, Cidades, Perfil) e uma rota empilhada de detalhe.

1. **Hoje** (`/(tabs)/index`)
   - Cabeçalho: cidade atual (toque abre a aba Cidades), data e hora local da cidade,
     anel de nível com número e nome do nível.
   - Faixa de streak: chama, "N dias seguidos", sete quadradinhos da semana (verde feito,
     amarelo hoje, tracejado folga por mau tempo).
   - Chips de atividade em rolagem horizontal; o chip ativo mostra o score da melhor janela.
   - **Cartão-herói** (estados na seção 3.3).
   - "Seu dia, hora a hora": arco do sol com nascer e pôr, 24 barras coloridas por score
     (verde ≥ 65, amarelo 45–64, vermelho < 45), marcador do "agora", legenda.
   - "Próximos dias": uma linha por dia (nome, glifo do tempo, melhor janela e temperatura,
     score em pílula colorida). O melhor dia da semana ganha borda e rótulo "melhor da
     semana". Cabeçalho da seção traz o comparativo ("Amanhã cedo é melhor que hoje").
     Toque abre `/day/[date]`.
   - Fundo: componente `Sky` com gradiente por fase do dia (seção 3.5).

2. **Cidades** (`/(tabs)/cities`)
   - Campo de busca com debounce de 300 ms, mínimo 2 caracteres, `language=pt`,
     `count=8`. Resultado: nome, estado (admin1), país com bandeira (emoji do
     `country_code`). Toque seleciona e volta para Hoje.
   - Botão "Usar minha localização": pede permissão, obtém coordenadas, faz reverse
     geocode com `expo-location` só para exibir o nome; as coordenadas vão direto para a
     previsão. Negativa de permissão mostra texto explicativo e mantém a busca.
   - Seções Favoritas (estrela no item) e Recentes (últimas 5, sem duplicar favoritas).
   - Estados: vazio inicial (dica de busca), sem resultados ("Nenhuma cidade encontrada
     para 'xyz'"), erro de rede com botão tentar de novo, carregando com esqueleto.

3. **Perfil** (`/(tabs)/profile`)
   - Cartão de nível: número, nome, XP atual, XP restante para o próximo, barra.
   - Três números: dias seguidos, atividades, cidades exploradas.
   - Calendário do mês: verde atividade, tracejado folga por mau tempo, subtítulo com
     contagem.
   - Conquistas em grade 4 colunas: desbloqueadas douradas, bloqueadas em cinza com
     progresso ("7/10"). Toque abre descrição e critério.
   - Histórico: atividade, cidade, data e hora, "plano cumprido" quando aplicável, XP.

4. **Detalhe do dia** (`/day/[date]`)
   - Mesma visão hora a hora e cartão de recomendação daquele dia, reusando os
     componentes de Hoje. Permite planejar para um dia futuro (apenas amanhã; ver 4.3).

**Primeira abertura.** Sem cidade salva, Hoje mostra o estado de boas-vindas: título
"A melhor hora para sair, em uma frase", botões "Buscar cidade" e "Usar minha
localização". Sem onboarding em etapas.

### 3.3 Estados do cartão-herói

| Estado | Quando | Conteúdo | Ação principal |
|--------|--------|----------|----------------|
| Planejar | Há janela boa hoje, sem plano | Rótulo + score, janela em numerais grandes, frase de explicação, 4 fatores (sensação, chuva %, vento km/h, UV), dicas de preparo | "Planejar {atividade} às {h}" com subtexto "+50 XP base · +25 se cumprir" |
| Planejado | Plano ativo, antes da janela | Hora planejada, contagem regressiva, horário do lembrete, previsão para a hora e score | "Desfazer plano" (secundário) |
| É agora | Plano ativo e agora dentro da janela (ou até 2 h depois do fim) | "Sua janela começou", score atual, condições atuais | "Confirmar que fui" (destaque) e link "Saí em outro horário" |
| Concluído | Atividade confirmada ou registrada hoje | "Corrida concluída · 17h42", XP grande, recibo com parcelas, barra de nível, cartão de conquista se houve desbloqueio; abaixo, atalho "Planejar amanhã às 7h" | Secundário |
| Sem janela boa | Melhor média do dia < 45 | "Sem janela boa", melhor score, motivo dominante, "Hoje não conta contra a sua sequência" | "Amanhã: 7h–9h, ótimo" (leva ao detalhe) |
| Registrar sem plano | Sem plano e janela já passou ou usuário quer registrar | Seletor de hora em que saiu | "Registrar atividade" |

### 3.4 Textos e tom

Factual, direto, sem exclamação em excesso. Emoji só como ícone (atividades, fatores,
badges, glifos de tempo), nunca como pontuação de frase. Números com separador PT-BR.
Todos os textos em `presentation/i18n/pt-BR.ts`.

### 3.5 Direção visual: "Céu vivo"

Mockups aprovados em `docs/superpowers/mockups/` (`visual-direction.html` para a escolha
da direção, `home-rich-v3.html` para as três telas de referência).

- **Sky**: gradiente de fundo por fase, calculada com a hora local da cidade e nascer/pôr
  do sol: amanhecer, dia, crepúsculo, noite; e "chuvoso" (cinza-azulado) quando o dia é
  "sem janela boa". Transição animada de 600 ms entre fases.
- **Tokens**: espaçamento em múltiplos de 4 (4, 8, 12, 16, 20, 24, 32); três raios (24
  herói e cartões grandes, 14–16 blocos internos, 999 chips e pílulas); superfícies em
  branco translúcido (14–16 % sobre o gradiente) com borda de 28 %; cores semânticas de
  score: verde `#8FF0B6`, amarelo `#FFD66B`, vermelho `#FF9B8A`, com texto escuro
  correspondente para contraste AA.
- **Tipografia**: fonte do sistema (SF Pro Rounded no iOS, Roboto no Android) com
  numerais tabulares; janela em 52 px peso 800, XP em 56 px peso 900. Se sobrar tempo,
  avaliar uma fonte com personalidade nos numerais (grotesca condensada).
- **Movimento** (Reanimated): contagem do XP no recibo, preenchimento da barra de nível,
  entrada do cartão de conquista, pulso do marcador "agora", transição do Sky. Tudo
  desliga com "reduzir movimento".
- **Acessibilidade**: todo toque com rótulo, cor de score sempre acompanhada de texto ou
  número, contraste AA, tamanhos de fonte respeitando escala do sistema até 130 %.

## 4. Motor de recomendação (domínio)

TypeScript puro em `apps/mobile/src/domain/recommendation`. Cobertura 100 %.

### 4.1 Entrada

- Previsão horária de 5 dias no fuso da cidade (`timezone=auto`), variáveis:
  `temperature_2m`, `apparent_temperature`, `precipitation_probability`, `precipitation`,
  `wind_speed_10m`, `wind_gusts_10m`, `uv_index`, `cloud_cover`, `weather_code`,
  `is_day`, `relative_humidity_2m`.
- Diário: `sunrise`, `sunset`, `weather_code`, `temperature_2m_max`, `temperature_2m_min`.
- `utc_offset_seconds` da resposta. O "agora" local da cidade é
  `Date.now() + utc_offset_seconds`, lido com getters UTC. Nunca usar o fuso do aparelho
  para decidir hora da cidade.
- Perfil da atividade (seção 3.1).

### 4.2 Score por hora (0–100)

Cada fator vira um conforto em [0, 1] por curva linear por partes:

- **Térmico** (`apparent_temperature`): 1 dentro da faixa ideal; cai linearmente até 0
  nos limites de tolerância; 0 fora.
- **Chuva**: probabilidade 0–20 % → 1; 20–50 % → 1 → 0,5; 50–80 % → 0,5 → 0,1;
  ≥ 80 % → 0. Volume 0,2–1 mm multiplica por 0,6.
- **Vento** (`wind_speed_10m`): ≤ ok → 1; linear até 0 em máx. Rajadas > 1,3 × máx
  multiplicam por 0,7.
- **UV**: ≤ ok → 1; linear até 0,3 em máx; piso 0,2 acima.
- **Sol** (`cloud_cover`): ≤ 30 % → 1; linear até 0,3 em 100 %.

`base = Σ peso_i × conforto_i` (0–1). `score = round(100 × base × luz)`, onde
`luz = 1` se `is_day`, senão o fator noturno do perfil.

**Vetos** (aplicados depois, o menor vence):

| Condição | Efeito |
|----------|--------|
| `weather_code` 95–99 (trovoada) | score = 0 |
| `precipitation_probability ≥ 80` ou `precipitation ≥ 1 mm` | score ≤ 20 |
| Neve (71–77, 85, 86) | score ≤ 20 |
| Sensação fora da faixa de tolerância | score ≤ 30 |
| Nevoeiro (45, 48) e atividade Ciclismo | score × 0,6 |

Rótulos: Ótimo ≥ 80, Bom 65–79, Razoável 45–64, Ruim < 45.

### 4.3 Escolha da janela

- Horas candidatas de hoje: da hora atual (incluída se faltam ≥ 30 min para acabar) até
  23 h. Para outros dias: 0–23 h.
- Testa janelas contíguas de 1, 2 e 3 horas. Descarta janelas com alguma hora < 45.
  Ranking = média + 3 pontos por hora adicional (uma janela de 3 h com média 91 vence uma
  de 1 h com 96; sem o bônus, a média de 3 h nunca supera a do melhor par e a regra
  degeneraria em "melhor hora isolada"). Empate → mais cedo. O score exibido é a média.
- Se não sobrar janela, resultado é `NoUsableWindow` com o melhor score isolado e o fator
  dominante da penalidade (para a frase "chuva a tarde inteira").
- "É agora": plano ativo e hora atual dentro da janela ou até 2 h após o fim.
- Planejamento só para hoje e amanhã (previsão confiável e evita planos esquecidos).

### 4.4 Explicação e ressalvas

Cada fator gera um descritor em PT-BR a partir do valor médio na janela:

- Térmico: gelado (< 8), frio (8–14), fresco (15–18), agradável (19–26), quente (27–31),
  muito quente (≥ 32).
- Chuva: sem chuva (< 10 %), baixa chance (10–30 %), chance de chuva (31–60 %),
  chuva provável (> 60 %).
- Vento: calmo (< 8), leve (8–19), moderado (20–34), forte (≥ 35).
- UV: baixo (0–2), moderado (3–5), alto (6–7), muito alto (≥ 8).
- Sol: céu aberto (< 30 %), parcialmente nublado (30–70 %), nublado (> 70 %).

A frase junta os 2 ou 3 fatores de maior peso para a atividade ("Sensação de 23°, sem
chuva e vento leve."). Um fator com conforto < 0,5 fora da janela mas próximo dela entra
como ressalva ("Antes das 16h o UV está alto: melhor esperar.").

**Ressalvas de preparação** (chips): "Use protetor" (UV ≥ 6 na janela), "Leve água"
(sensação ≥ 28), "Esfria às {h}" (queda ≥ 4 °C até 2 h após a janela), "Leve capa"
(chuva > 40 % na hora seguinte à janela), "Leve casaco" (sensação < 14).

### 4.5 Saídas derivadas

- **Score de agora**: score da hora atual com rótulo.
- **Próximos dias**: melhor janela, rótulo, score, glifo de tempo (do `weather_code`
  diário) e resumo curto, para 4 dias.
- **Comparativo**: se a melhor janela de amanhã supera a de hoje em ≥ 10 pontos, gera
  "Amanhã cedo é melhor que hoje". Se hoje é o melhor da semana, "Hoje é o melhor dia
  da semana".
- **Melhor da semana**: dia com maior score entre os 5.

### 4.6 Config remota

Perfis, curvas, limiares de descritores, limiares de ressalvas e constantes de XP vivem em
`engine.json` (schema Zod em `packages/contracts`, campo `schemaVersion`). O app baixa
de `${ASSETS_URL}/config/v1/engine.json` com cache de 24 h, valida, e guarda a última
cópia válida. Sem rede ou schema inválido, usa a cópia embutida. O domínio recebe a
config como parâmetro; nunca lê de rede nem de storage.

## 5. Gamificação (domínio)

`apps/mobile/src/domain/gamification`. Event sourcing local: log imutável de eventos,
estado derivado por função pura `deriveProgress(events, clock)`.

### 5.1 Eventos

```ts
type GamificationEvent =
  | { type: 'planned'; id; cityId; activity; date; window: {startHour; endHour}; windowScore; createdAt }
  | { type: 'confirmed'; id; planId; date; hourLeft; hourScore; createdAt }
  | { type: 'logged'; id; cityId; activity; date; hourLeft; hourScore; createdAt }
  | { type: 'planCancelled'; id; planId; createdAt }
  | { type: 'badWeatherDay'; id; cityId; date; bestScore; createdAt }
```

`badWeatherDay` é gravado quando o app calcula "sem janela boa" para o dia atual da
cidade selecionada. Se o usuário não abrir o app num dia ruim, o streak quebra (limitação
aceita e documentada).

### 5.2 XP

Só um registro conta XP por dia (o primeiro). Planos não confirmados expiram no fim do
dia sem penalidade.

| Parcela | Valor |
|---------|-------|
| Atividade registrada | 50 |
| Horário | `round(hourScore / 2)` (score 86 → +43) |
| Plano cumprido (confirmou dentro da janela ou até 2 h depois) | +25 |
| Sequência | `5 × min(streakAtualIncluindoHoje, 10)` (7 dias → +35, teto +50) |

Total do exemplo: 50 + 43 + 25 + 35 = 153 XP. Os valores nos mockups são ilustrativos;
esta tabela é a fonte de verdade.

### 5.3 Níveis

XP acumulado para atingir o nível N: `100 × (N − 1)²`.

| Nível | XP  | Nome           |
|-------|-----|----------------|
| 1     | 0   | Brisa          |
| 2     | 100 | Garoa          |
| 3     | 400 | Sol            |
| 4     | 900 | Ventania       |
| 5     | 1600| Aurora         |
| 6     | 2500| Tempestade     |
| 7     | 3600| Furacão        |
| 8     | 4900| Clima Perfeito |

### 5.4 Streak

Dias consecutivos (no fuso da cidade do registro) com `confirmed` ou `logged`. Um dia com
`badWeatherDay` e sem atividade **não quebra nem incrementa** (folga protegida). Qualquer
outro dia sem atividade zera.

### 5.5 Badges

| Chave | Nome | Critério |
|-------|------|----------|
| first | Primeira saída | 1ª atividade |
| early | Madrugador | atividade com `hourLeft` < 7 |
| owl | Coruja | atividade com `hourLeft` ≥ 20 |
| explorer | Explorador | 5 cidades distintas |
| planner | Fiel ao plano | 10 planos cumpridos |
| week | Semana cheia | streak 7 |
| multi | Multiatleta | as 5 atividades |
| perfect | Clima perfeito | atividade com `hourScore` ≥ 95 |

Badges bloqueadas expõem progresso quando contável (planner 7/10, multi 3/5, explorer 4/5).

### 5.6 Notificação local

Ao planejar, agenda notificação local 30 min antes do início da janela via
`expo-notifications`. Cancela ao desfazer. O plano de implementação deve verificar o
suporte do Expo Go atual a notificações locais no Android; se não houver, o recurso fica
condicional à plataforma e o app segue funcionando.

## 6. Arquitetura do app

### 6.1 Camadas (hexagonal leve)

```
apps/mobile/src/
├── domain/            # entidades, value objects, regras puras. Zero dependências.
│   ├── recommendation/
│   ├── gamification/
│   ├── activities/
│   └── time/          # LocalDateTime, fases do dia, formatação
├── application/       # casos de uso + ports. Depende só de domain.
│   ├── ports/         # ForecastProvider, GeocodingProvider, LocationProvider,
│   │                  # ProgressRepository, PreferencesRepository, EngineConfigProvider,
│   │                  # NotificationScheduler, Clock, Logger
│   └── useCases/      # searchCities, getRecommendation, planActivity, confirmActivity,
│                      # logActivity, cancelPlan, getProgress, recordBadWeatherDay
├── infrastructure/    # um adapter por port
│   ├── openMeteo/     # client direto (schemas Zod + mappers)
│   ├── bff/           # client do BFF (schemas de packages/contracts)
│   ├── location/      # expo-location
│   ├── storage/       # AsyncStorage: progress (event log), preferences, engine config cache
│   ├── notifications/ # expo-notifications
│   ├── clock/
│   ├── logger/
│   └── container.ts   # composition root: escolhe adapters por env e monta os casos de uso
└── presentation/
    ├── app/           # rotas Expo Router
    ├── features/      # home/, cities/, profile/, day/ (screen + components + hooks)
    ├── queries/       # TanStack Query: keys factory, hooks que chamam casos de uso
    ├── state/         # Zustand: cidade e atividade atuais, favoritas, recentes
    ├── ui/            # tokens, Text, Card, Chip, Button, Sky, Skeleton
    └── i18n/          # pt-BR.ts
```

Regras impostas por `eslint-plugin-boundaries`: `domain` não importa nada; `application`
importa `domain`; `infrastructure` importa `application` e `domain`; `presentation`
importa `application` e `domain` e recebe `infrastructure` só pelo container via Context.

### 6.2 Padrões

- **Result type** sem lib: `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`.
  Casos de uso nunca lançam; erros são uniões discriminadas por caso de uso.
- **Value objects validados**: `Score` (0–100), `Coordinates`, `LocalDateTime`,
  `TimeWindow` (start < end, mesmo dia). Construtores retornam `Result`.
- **Imutabilidade** em todo o código: sem mutação de objetos ou arrays; redutores
  devolvem cópias.
- **Composition root** único; sem framework de DI. `AppServices` tipado exposto por
  `ServicesProvider`; hooks acessam por `useServices()`.
- **Query keys factory** (`queries/keys.ts`) e políticas: forecast `staleTime` 15 min,
  `gcTime` 2 h, retry 2 com backoff; cidades `staleTime` 24 h; progresso invalidado após
  cada evento gravado.
- **Feature folders**; componentes de apresentação puros (props in, JSX out); hooks fazem
  a ponte com application.
- **Erros de UI**: `ErrorBoundary` na raiz com tela amigável e botão de recarregar;
  erros de rede e de schema viram estados desenhados, nunca tela branca.
- **Logger** injetado; `console.*` proibido por lint.
- Arquivos abaixo de 300 linhas; funções abaixo de 50.

### 6.3 Persistência

- `ProgressRepository`: `progress:v1` no AsyncStorage, `{ schemaVersion, events[] }`,
  poda eventos com mais de 365 dias na escrita. Migrações por versão em
  `storage/migrations.ts`.
- `PreferencesRepository`: `prefs:v1` com cidade atual, atividade atual, favoritas (máx.
  20), recentes (máx. 5).
- `EngineConfigCache`: `engineConfig:v1` com `{ fetchedAt, config }`.

### 6.4 Modos de API

`EXPO_PUBLIC_API_MODE=direct | bff` (padrão `direct`). Em `direct`, container injeta
`OpenMeteoForecastProvider` e `OpenMeteoGeocodingProvider` e a config embutida. Em
`bff`, injeta os clients do BFF (`EXPO_PUBLIC_BFF_URL`) e o `EngineConfigProvider`
remoto (`EXPO_PUBLIC_ASSETS_URL`). O avaliador roda em `direct` sem configurar nada.

## 7. BFF e infra

### 7.1 Monorepo

```
melhor-hora/
├── apps/mobile        # Expo (SDK atual), TypeScript
├── apps/bff           # Node 22, Hono, ioredis, Zod, pino, Vitest
├── packages/contracts # schemas Zod compartilhados: CityDTO, ForecastDTO, EngineConfig
├── infra/             # docker-compose.yml, Caddyfile, scripts de deploy
├── docs/              # adr/, apresentacao.md, superpowers/
└── .github/workflows/
```

pnpm workspaces, TypeScript project references, `pnpm -r lint|typecheck|test`.

### 7.2 BFF

| Endpoint | Função | Cache Redis |
|----------|--------|-------------|
| `GET /v1/cities?q=&lang=pt` | Proxy do geocoding, resposta normalizada `CityDTO[]` | `geo:v1:{lang}:{q normalizado}` TTL 24 h |
| `GET /v1/forecast?lat=&lon=` | Proxy do forecast com os parâmetros fixos da seção 4.1, resposta `ForecastDTO` | `fc:v1:{lat 2 casas}:{lon 2 casas}` TTL 15 min |
| `GET /health` | Estado do processo e do Redis | — |

- Validação de query com Zod; resposta da Open-Meteo validada antes de cachear (nunca
  cachear lixo).
- Rate limit por IP: 60 req/min, janela deslizante em Redis; 429 com `Retry-After`.
- Timeout de 5 s para a Open-Meteo; erro upstream vira 502 com corpo padronizado
  `{ error: { code, message } }`. Se o Redis cair, o BFF segue sem cache e loga.
- Logs estruturados (pino) com `cacheHit`, latência e rota; contador de acerto de cache
  exposto em `/health`.
- CORS restrito a origens configuradas; headers de segurança (`nosniff`, `frame-deny`,
  HSTS via Caddy).
- Sem segredos: Open-Meteo é sem chave. Credenciais do MinIO só no `.env` da VPS.

### 7.3 Bucket e CDN

- MinIO com bucket `assets`, leitura pública, escrita só com credenciais.
- Conteúdo: `config/v1/engine.json`, `badges/*.webp` (2 tamanhos), `activities/*.webp`.
- Servido em `assets.<domínio>` pelo Caddy com `Cache-Control: public, max-age=86400`
  para imagens e `max-age=300, stale-while-revalidate=86400` para o config.
- Cloudflare proxiado como CDN com cache rule em `/config/*` e `/assets/*`. Requer
  domínio registrado na Cloudflare (ver Questões em aberto). Sem ele, o Caddy faz o
  cache de borda e a Cloudflare entra depois só trocando o DNS.
- O app embute cópia de todos os assets e do config; o bucket é otimização.

### 7.4 Docker Compose (VPS)

Serviços: `bff` (imagem do GHCR), `redis` (AOF, volume), `minio` (volume), `caddy`
(TLS automático, volumes de certificados). Rede interna; só o Caddy expõe 80/443.
Healthchecks em todos. `infra/deploy.sh` faz `docker compose pull && up -d --wait`.

### 7.5 Variáveis de ambiente

Mobile: `EXPO_PUBLIC_API_MODE`, `EXPO_PUBLIC_BFF_URL`, `EXPO_PUBLIC_ASSETS_URL`.
BFF: `PORT`, `REDIS_URL`, `ALLOWED_ORIGINS`, `OPEN_METEO_BASE_URL`,
`GEOCODING_BASE_URL`, `RATE_LIMIT_PER_MIN`, `UPSTREAM_TIMEOUT_MS`, `LOG_LEVEL`.
Todos validados com Zod na inicialização; `.env.example` versionado.

## 8. Qualidade, testes e CI

### 8.1 Ferramentas

TypeScript `strict` com `noUncheckedIndexedAccess`. ESLint com `eslint-config-expo`,
`eslint-plugin-boundaries`, `import/order`, regra proibindo `console`. Prettier. Husky +
lint-staged (lint e prettier nos arquivos alterados) + commitlint (conventional commits).

### 8.2 Testes (TDD: teste antes da implementação)

| Camada | Ferramenta | Cobertura alvo | O que cobre |
|--------|------------|----------------|-------------|
| domain | Jest | 100 % | curvas, vetos, janela, sem janela, descritores, frase, ressalvas, XP, níveis, streak com folga, badges, LocalDateTime em fusos diferentes |
| application | Jest com ports falsos | ≥ 90 % | cada caso de uso, caminhos de erro, um registro por dia, expiração de plano |
| infrastructure | Jest + MSW | ≥ 80 % | schemas Zod com fixtures reais da Open-Meteo, mappers, migrações de storage, seleção de adapter por env |
| presentation | Jest + RNTL + MSW | ≥ 80 % | cada tela nos estados carregando, erro, vazio, sucesso; ciclo planejar → confirmar; busca com debounce; favoritas e recentes |
| bff | Vitest + Redis em container | ≥ 85 % | cache hit/miss, TTLs, rate limit, validação, fallback sem Redis |
| E2E | Maestro | 3 fluxos | buscar e escolher cidade; planejar e confirmar; ver perfil |

Cobertura global mínima de 80 % imposta no CI.

### 8.3 CI/CD (GitHub Actions)

- `ci.yml` em push e PR: jobs paralelos `mobile` (install, lint, typecheck, test com
  cobertura, upload do relatório), `bff` (idem, com serviço Redis), `contracts`.
- `deploy-bff.yml` em push em `master` após `ci` verde: build multi-stage, push para
  GHCR com tag do SHA, SSH na VPS, `deploy.sh`, verificação de `/health`.
- `publish-assets.yml` manual: envia `infra/assets/` e `engine.json` para o MinIO.
- Opcional: `eas-update.yml` para OTA e `eas-build.yml` para APK de preview.

## 9. Documentação de entrega

- `README.md`: o que é, screenshots, como rodar em 3 comandos (`pnpm i`,
  `pnpm --filter mobile start`, QR no Expo Go), modos `direct` e `bff` com a URL pública,
  diagrama Mermaid da arquitetura, explicação do motor com um exemplo numérico completo,
  decisões e trade-offs, o que faria com mais tempo.
- `docs/adr/`: 0001 Expo managed, 0002 hexagonal leve, 0003 event sourcing local para
  gamificação, 0004 BFF com cache Redis, 0005 config remota do motor, 0006 fallback
  direto por variável de ambiente, 0007 motor no dispositivo e não no servidor.
- `docs/apresentacao.md`: pontos de fala (seção 10).
- `apps/bff/README.md` e `infra/README.md` curtos.

## 10. Pontos para a apresentação

- **Cache no servidor**: mil usuários na mesma cidade geram **uma** chamada à
  Open-Meteo, não mil. Respeita o uso justo da API e reduz latência para milissegundos.
- **Desacoplamento do provedor**: o app fala com o BFF em um contrato próprio; trocar de
  provedor de clima muda o BFF, não o app.
- **Config remota do motor**: pesos, curvas e regras de badges ajustáveis sem publicar
  versão nova; o app cacheia a última cópia válida e funciona offline.
- **Fallback direto**: o mesmo port `ForecastProvider` com dois adapters; o avaliador roda
  sem infra nenhuma. Ports and adapters demonstrado com um caso real, não teórico.
- **Motor no dispositivo**: funciona offline com a última previsão em cache, e a lógica
  fica legível no repositório, que é o que o teste pede para explicar.
- **Vetos além da média**: uma média boa não esconde trovoada; explicar com exemplo.
- **Streak protegido por mau tempo**: gamificação alinhada com a realidade do clima.
- **Recibo de XP**: o usuário vê a conta; transparência gera confiança no jogo.
- **Fuso da cidade, não do aparelho**: buscar Lisboa de São Paulo mostra o "agora" certo.
- **Rate limit e validação no BFF**: nunca cacheia resposta inválida; segue sem cache se
  o Redis cair.

## 11. Questões em aberto

1. **Nome do app**: "Melhor Hora" é provisório.
2. **Domínio para a Cloudflare**: necessário para a CDN proxiada. Sem ele, o Caddy faz o
   cache de borda até haver domínio.
3. **Conta Expo/EAS**: só para os opcionais de APK e OTA.
4. **Notificações locais no Expo Go Android**: verificar no início do plano.

## 12. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Infra consumir tempo do app | Ordem do plano: motor e app em `direct` primeiro; BFF e infra depois; CDN por último |
| Visual parecer genérico | Mockups aprovados como referência; revisão visual em dispositivo real a cada tela |
| Expo Go sem algum módulo | Todos os módulos escolhidos (location, notifications, reanimated, async-storage) são suportados; verificar versões no plano |
| Fuso horário errado | `LocalDateTime` no domínio com testes em três fusos |
| Cobertura 80 % atrasar | TDD desde o domínio; cobertura sobe junto com o código, não no fim |
