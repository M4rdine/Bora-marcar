# Roteiro da apresentação

Doze pontos (dez do spec, seção 10, mais dois extras da rodada de QA visual). Cada um traz o
que falar e o que mostrar ao vivo: comando, tela do app ou trecho de código.

## 1. Cache no servidor

> "o cache no servidor: mil usuários na mesma cidade geram apenas uma chamada, não mil"

**Mostrar:**

```bash
curl -si 'http://localhost:8180/v1/forecast?lat=-23.55&lon=-46.63' | grep -i '^x-cache'
# X-Cache: MISS   (primeira chamada: vai à Open-Meteo e grava no Redis)

curl -si 'http://localhost:8180/v1/forecast?lat=-23.55&lon=-46.63' | grep -i '^x-cache'
# X-Cache: HIT    (segunda chamada, mesma cidade: responde do Redis em ms)
```

Chaves e TTLs em `apps/bff/README.md` (`fc:v1:{lat 2 casas}:{lon 2 casas}` 15 min,
`geo:v1:{lang}:{q}` 24 h). Contador de acerto em `GET /health` (`cache.hitRate`).

## 2. Desacoplamento do provedor

O app fala com o BFF no contrato próprio de `packages/contracts` (`ForecastDTO`,
`CityDTO`); trocar de provedor de clima muda o BFF (`apps/bff/src/upstream/openMeteo.ts`),
não o app.

**Mostrar:** `apps/mobile/src/infrastructure/bff/bffForecastClient.ts` (mapeia a mesma
`Forecast` do domínio a partir do DTO do BFF, igual ao adapter direto).

## 3. Config remota do motor

Perfis, pesos, limiares e regras de XP/níveis são ajustáveis sem publicar versão nova; o
app cacheia a última cópia válida e funciona offline.

**Trade-off a citar:** XP e níveis são derivados dos eventos com a config atual, então mudar `xp`
ou `levels` remotamente recalcula os totais passados. Próximo passo: gravar o detalhamento do XP
nos eventos `confirmed`/`logged` (ADR 0005, Consequências).

**Mostrar:**

- `infra/assets/config/v1/engine.json` (o arquivo publicado no bucket).
- `apps/mobile/src/infrastructure/config/remoteEngineConfigProvider.ts` (cache de 24 h,
  cópia guardada, fallback embutido).
- ADR 0005 (`docs/adr/0005-config-remota-do-motor.md`).

## 4. Fallback direto

O mesmo port `ForecastProvider` com dois adapters; o avaliador roda sem infra nenhuma. Ports
and adapters demonstrado com um caso real, não teórico.

**Mostrar:**

```bash
pnpm --filter mobile start                                           # EXPO_PUBLIC_API_MODE ausente → direct
EXPO_PUBLIC_API_MODE=bff EXPO_PUBLIC_BFF_URL=https://bora-marcar.duckdns.org \
  EXPO_PUBLIC_ASSETS_URL=https://bora-marcar.duckdns.org pnpm --filter mobile start  # bff
```

Trecho: `apps/mobile/src/infrastructure/adapters.ts` (`selectAdapters`) e ADR 0006.

## 5. Motor no dispositivo

Funciona offline com a última previsão em cache, e a lógica fica legível no repositório —
o que o teste pede para explicar.

**Mostrar:** `apps/mobile/src/domain/recommendation/scoreHour.ts` com o exemplo numérico do
README (seção "Como o motor decide"); nenhuma chamada de rede no arquivo.

## 6. Vetos além da média

Uma média boa não esconde trovoada.

**Mostrar:** `apps/mobile/src/domain/recommendation/vetoes.ts` — hora com `weather_code`
95/96/99 (trovoada) zera o score mesmo que térmico, vento e UV estejam perfeitos
(`scoreHour.test.ts`, "aplica vetos depois da média").

## 7. Streak protegido por mau tempo

Gamificação alinhada com a realidade do clima: um dia sem janela boa não pune quem não
consegue sair.

**Mostrar:** faixa de streak na tela Hoje (quadradinho tracejado = folga); código em
`apps/mobile/src/domain/gamification/streak.ts` (`restDates` não quebra nem incrementa) e o
evento `badWeatherDay` (spec 5.1).

## 8. Recibo de XP

O usuário vê a conta; transparência gera confiança no jogo.

**Mostrar:** estado "Concluído" do cartão-herói (`docs/superpowers/qa/2026-09-15-web-depois/home-done.png`)
com o recibo por parcela; código em `apps/mobile/src/domain/gamification/xp.ts`
(`computeXp`: base 50 + `round(hourScore/2)` + 25 se cumprido + `5 × min(streak, 10)`) e
`XpReceipt.tsx`.

## 9. Fuso da cidade, não do aparelho

Buscar Lisboa de São Paulo mostra o "agora" certo.

**Mostrar:** `apps/mobile/src/domain/time/localDateTime.ts` (`localNow` usa
`utc_offset_seconds` da resposta, getters UTC); trocar de cidade na aba Cidades e observar a
hora do cabeçalho mudar imediatamente para o fuso da cidade nova.

## 10. Rate limit e validação no BFF

Nunca cacheia resposta inválida; segue sem cache se o Redis cair.

**Mostrar:**

```bash
for i in $(seq 1 65); do curl -s -o /dev/null -w '%{http_code} ' 'http://localhost:8180/v1/cities?q=lisboa&lang=pt'; done
# ... 200 200 200 ... 429 429  (acima de 60/min por IP)
```

Código: `apps/bff/src/http/rateLimit.ts` e `apps/bff/src/cache/resilientCache.test.ts`
(fallback sem Redis).

## 11. Madrugada fora das candidatas (extra)

Achado da rodada de QA visual: em Tóquio, com chuva o dia inteiro, o motor recomendava
"1h–4h" porque o fator noturno só reduzia o score sem excluir o horário. Ninguém quer uma
caminhada às 1h recomendada.

**Mostrar:** `apps/mobile/src/domain/recommendation/windows.ts` (`candidateHours` filtra por
`cfg.window.quietHoursEnd = 5`); o score da madrugada continua real na linha do dia e conta
para XP e para a badge "Madrugador" — só não entra como _janela recomendada_. Achado #1 em
`docs/superpowers/qa/2026-09-15-qa-visual-web.md`.

## 12. QA visual com CDP (extra)

Antes de fechar a entrega, o app foi comparado pixel a pixel com o mockup aprovado usando o
Chrome DevTools Protocol, não só testes automatizados.

**Mostrar:** `tools/qa-web/` (harness que sobe `expo start --web`, emula um iPhone via CDP,
semeia `localStorage` e intercepta a Open-Meteo para forçar cenários como "dia inteiro de
chuva"); capturas antes/depois e a lista de 16 achados corrigidos em
`docs/superpowers/qa/2026-09-15-qa-visual-web.md`.
