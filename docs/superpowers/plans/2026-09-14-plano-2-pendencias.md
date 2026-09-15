# Plano 2 — pendências e decisões herdadas para o Plano 3

Origem: revisão final de branch do Plano 2 (2026-09-14, Tarefa 9). Itens já corrigidos não constam.

## Obrigatório: smoke manual no Expo Go

Não executado por automação (proibido nesta tarefa); executar pelo humano antes de dar o Plano 2
por encerrado. Roteiro (`pnpm --filter mobile start` → abrir no Expo Go):

1. Tela de boas-vindas → "Buscar cidade" → digitar "São Paulo" → escolher.
2. Hoje mostra janela, frase, lista horária e próximos dias.
3. Trocar atividade muda a janela.
4. "Planejar" → estado Planejado (ou Confirmar, se dentro da janela).
5. "Confirmar que fui" → Concluído com XP.
6. Perfil mostra nível, streak 1 e badge "Primeira saída".
7. "Usar minha localização" pede permissão e seleciona.
8. Fechar e reabrir o app mantém cidade e progresso.

Como sanity check de build no lugar do smoke, a Tarefa 9 rodou
`pnpm --filter mobile exec expo export --platform ios --output-dir /tmp/mh-export` (bundle iOS
gerado com sucesso, 1406 módulos) e removeu o diretório de saída em seguida.

## Obrigatórios no Plano 3 (app + design system)

- resolvido no Plano 3: **Perfil "hoje" usa fuso do aparelho** — `utcOffsetSeconds` é guardado em
  `prefs:v1` na última previsão bem-sucedida e `useToday` deriva "hoje" com ele tanto em Hoje quanto
  no Perfil.
- resolvido no Plano 3: **`/day/[date]` e planejar amanhã** — `plansByDate` no domínio de
  gamificação permite planejar/consultar um dia diferente de hoje; a rota `/day/[date]` usa isso
  para o detalhe de amanhã.
- **`useBadWeatherRecorder` sem guarda por data repetida**: o hook chama
  `services.recordBadWeatherDay` sempre que `noWindow` for verdadeiro e a `date` mudar no `useEffect`,
  confiando inteiramente na idempotência do caso de uso/domínio (`recordBadWeatherDay.ts`,
  `deriveProgress.ts`) para não duplicar o evento. Considerar um guard local (`useRef` do último
  `date` já registrado) para evitar chamadas de rede desnecessárias em re-renders com o mesmo dia,
  já que hoje cada render com `noWindow=true` reexecuta o efeito sempre que qualquer dependência
  (`services`, `bestScore`) mudar de identidade.
- **Branch coverage de `HeroCard`/`NextDaysList`**: cobertura de branch abaixo de 100 %
  (`HeroCard.tsx` ~69 %, `NextDaysList.tsx` ~75 %) — faltam casos como `state.day.caveat` nulo/(não
  nulo), `state.day.tips` vazio, `comparison` em cada um dos três valores (`tomorrowBetter` /
  `todayBestOfWeek` / nenhum) e o dia marcado como `bestDate` no `NextDaysList`. Não bloqueia a
  cobertura global (96–97 % agregado), mas vale endurecer ao construir o design system do Plano 3
  sobre esses componentes.
- resolvido: `buildOverview` puro com `nowEpochMs`.
- resolvido no Plano 3: **Seletor de hora para "Registrar atividade"** — o registro livre abre um
  seletor de hora (destacando a hora atual) em vez de assumir sempre `snapshot.now.hour`.
- resolvido no Plano 3: **Minutos no texto "Concluído às"** — o evento de registro guarda o minuto
  real do relógio (`minuteLeft`), exibido como "Concluído às 14h37" em vez de sempre "00".
- resolvido no Plano 3: **Funções de tela acima de 50 linhas** — `HomeScreen.tsx` e
  `CitiesScreen.tsx` tiveram subcomponentes extraídos ao construir o design system.
- resolvido no Plano 3 (Tarefa 11): **MSW para testes de tela com HTTP real** —
  `HomeScreen.msw.test.tsx` cobre caminho feliz, erro HTTP e resposta fora do schema contra
  `createOpenMeteoGeocoding`/`createOpenMeteoForecast` de verdade; ver notas de ambiente em
  `2026-09-14-plano-3-pendencias.md`.

## Herdado do Plano 1, ainda aberto

- resolvido no Plano 3 (Tarefa 12): **`tsconfig.json`** — `baseUrl`/`ignoreDeprecations` removidos;
  `paths` mantido com prefixo `"./"` explícito; `tsc --noEmit` e `expo export --platform ios`
  confirmados verdes.

## Para o Plano 4

- **`expo lint` não cobre `eslint.config.js`/`jest.setup.js`**: esses dois arquivos ficam fora da
  raiz `src/` e não passam pelo `expo lint` do Plano 2 (nem pelo probe manual desta tarefa, que usa
  `eslint --stdin` direto). Tratar isso na configuração de CI do Plano 4, cobrindo explicitamente
  arquivos de config na raiz de `apps/mobile`.
- **`env.ts`: modo `bff` com URL inválida deve falhar alto**: hoje uma `EXPO_PUBLIC_BFF_URL`
  inválida em modo `bff` degrada silenciosamente para `direct` (com aviso de log); quando o Plano 4
  introduzir o BFF de verdade, isso deve falhar alto (erro visível, não fallback silencioso) para
  não mascarar configuração quebrada em produção.

## Minors diferidos (fazer se sobrar tempo)

- Reavaliar se `activePlanFor(date)` deve viver em `domain/gamification` (puro) ou como parte do
  caso de uso `getProgress` em `application/useCases` — decidir ao desenhar `/day/[date]`.
- `HomeScreen.tsx` tem branch/linha não cobertas nos ramos de erro (`overview.status === 'error'`)
  e no fluxo `resolveLocation` de `Welcome` — cobertos indiretamente por `useOverview`/`CitiesScreen`
  mas sem teste de tela direto para o card de erro de rede combinado com retry a partir de `HomeScreen`.
- `env.ts` linha 30 sem cobertura (branch do modo `bff` caindo em `direct` com aviso) — só
  relevante quando o Plano 4 introduzir o BFF de verdade.
- **Ramos nulos de `mapForecast`**: os ramos que tratam campos ausentes/nulos do DTO da Open-Meteo
  só são cobertos com um DTO sintético construído no teste, não com uma resposta real da API —
  vale revisitar com um fixture gravado de uma resposta real ao endurecer `infrastructure/openMeteo`.
