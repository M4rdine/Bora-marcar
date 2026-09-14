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
- **Aviso `react-hooks/exhaustive-deps` em `useOverview`**: `pnpm --filter mobile exec eslint
src/presentation/queries/useOverview.ts` reporta
  `React Hook useMemo has an unnecessary dependency: 'tick'` na linha do `useMemo` de
  `useOverview.ts`. `tick` é usado deliberadamente só para forçar a recomputação do "agora" a cada
  minuto (comentário no código), então o "unnecessary" é falso-positivo do lint — mas hoje ele passa
  silencioso (warning, não error, não falha `pnpm lint`). Resolver com um
  `// eslint-disable-next-line react-hooks/exhaustive-deps` explicado, ou reestruturar para não
  depender de um valor não lido dentro do callback.
- **MSW para testes de tela com HTTP real**: os testes de `HomeScreen`/`CitiesScreen` usam
  `fakeServices`/ports falsos (decisão documentada no Plano 2, seção 8.2 do spec). Adicionar MSW
  (Mock Service Worker) para cobrir pelo menos um teste de tela ponta a ponta contra os adapters
  reais de `infrastructure/openMeteo`, validando serialização de query params, parsing do DTO e
  mapeamento de erros HTTP sem depender só dos testes unitários de `forecastClient`/`geocodingClient`.

## Minors diferidos (fazer se sobrar tempo)

- Reavaliar se `activePlanFor(date)` deve viver em `domain/gamification` (puro) ou como parte do
  caso de uso `getProgress` em `application/useCases` — decidir ao desenhar `/day/[date]`.
- `HomeScreen.tsx` tem branch/linha não cobertas nos ramos de erro (`overview.status === 'error'`)
  e no fluxo `resolveLocation` de `Welcome` — cobertos indiretamente por `useOverview`/`CitiesScreen`
  mas sem teste de tela direto para o card de erro de rede combinado com retry a partir de `HomeScreen`.
- `env.ts` linha 30 sem cobertura (branch do modo `bff` caindo em `direct` com aviso) — só
  relevante quando o Plano 4 introduzir o BFF de verdade.
