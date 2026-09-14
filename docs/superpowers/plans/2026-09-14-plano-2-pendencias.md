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

- **Perfil "hoje" usa fuso do aparelho**: `ProfileScreen` calcula o dia atual com o relógio/fuso do
  device, não com o `utcOffsetSeconds` da última previsão da cidade selecionada. Guardar
  `utcOffsetSeconds` nas preferências (`prefs:v1`) na última previsão bem-sucedida e usá-lo para
  derivar "hoje" também no Perfil, como já é feito em Hoje.
- **`/day/[date]` e planejar amanhã**: adicionar `activePlanFor(date)` (ou `plansByDate`) ao domínio
  de gamificação para permitir planejar/consultar um dia diferente de hoje; hoje `deriveProgress`
  só expõe o plano ativo do dia corrente implicitamente via eventos mais recentes.
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
- **Seletor de hora para "Registrar atividade"**: hoje `hourLeft` é sempre a hora atual
  (`snapshot.now.hour`) quando o usuário toca "Registrar atividade" no `HomeScreen`. Não há como
  registrar uma atividade feita numa hora diferente da atual; adicionar um seletor de hora ao fluxo
  de registro livre no Plano 3.
- **Minutos no texto "Concluído às"**: `t.home.done(hour, minute)` já aceita minuto, mas o registro
  (`logActivity`/`confirmActivity`) só guarda `hourLeft` (hora inteira) — o minuto exibido é sempre
  `00`. Guardar o minuto real do evento para exibir "Concluído às 14h37" em vez de "14h00".
- **Funções de tela acima de 50 linhas**: `HomeScreen.tsx` e `CitiesScreen.tsx` têm funções de
  componente acima do limite de 50 linhas do checklist de estilo; extrair subcomponentes ao
  construir o design system do Plano 3.
- **MSW para testes de tela com HTTP real**: os testes de `HomeScreen`/`CitiesScreen` usam
  `fakeServices`/ports falsos (decisão documentada no Plano 2, seção 8.2 do spec). Adicionar MSW
  (Mock Service Worker) para cobrir pelo menos um teste de tela ponta a ponta contra os adapters
  reais de `infrastructure/openMeteo`, validando serialização de query params, parsing do DTO e
  mapeamento de erros HTTP sem depender só dos testes unitários de `forecastClient`/`geocodingClient`.

## Herdado do Plano 1, ainda aberto

- **`tsconfig.json`**: `baseUrl`/`ignoreDeprecations` seguem como decisão pendente herdada do
  Plano 1 (não revisitada nesta tarefa).

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
