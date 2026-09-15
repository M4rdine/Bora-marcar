# Plano 3 — pendências e decisões herdadas para o Plano 4

Origem: implementação das Tarefas 11 e 12 do Plano 3 (2026-09-14). Itens já corrigidos não constam.

## Obrigatório: smoke manual no Expo Go

Não executado por automação (proibido nesta tarefa); executar pelo humano antes de dar o Plano 3
por encerrado. Roteiro (`pnpm --filter mobile start` → abrir no Expo Go):

1. Tela de boas-vindas → "Buscar cidade" → digitar "São Paulo" → escolher.
2. Hoje mostra janela, frase, lista horária e próximos dias sobre o céu (gradiente por fase).
3. Trocar atividade muda a janela.
4. "Planejar" → estado Planejado (ou Confirmar, se dentro da janela).
5. "Confirmar que fui" → Concluído com XP.
6. Perfil mostra nível, streak 1 e badge "Primeira saída".
7. "Usar minha localização" pede permissão e seleciona.
8. Fechar e reabrir o app mantém cidade e progresso.
9. Tocar num dia futuro em "Próximos dias" abre `/day/[date]`.
10. Em `/day/[date]` de amanhã, planejar a atividade (não deve haver botão "Registrar" — só
    planejar é permitido para dias futuros) e voltar para Hoje.
11. Registrar uma atividade escolhendo uma hora diferente da atual no seletor de hora (não a hora
    corrente) e conferir que o "Concluído às Xh" reflete a hora escolhida, não o relógio.
12. No Perfil, abrir o calendário do mês e conferir os dias de folga (chuva) marcados, e tocar numa
    conquista para ver a descrição e o progresso.
13. Com um leitor de tela (VoiceOver no iOS ou TalkBack no Android) ativado, navegar até uma linha
    de cidade em Cidades: ela tem um botão de favoritar (estrela) aninhado dentro do botão de
    selecionar a cidade — conferir que o leitor de tela consegue focar e acionar os dois
    separadamente, sem "engolir" o toque da estrela como parte da linha.
14. Conferir que os ícones das abas (Hoje/Cidades/Perfil) aparecem e têm rótulo lido pelo leitor de
    tela.

Como sanity check de build no lugar do smoke, a Tarefa 12 rodou
`pnpm --filter mobile exec expo export --platform ios --output-dir /tmp/mh-export` (bundle iOS
gerado com sucesso, 1831 módulos) e removeu o diretório de saída em seguida.

## Herdado do Plano 1/2, resolvido nesta branch

- `tsconfig.json`: `baseUrl`/`ignoreDeprecations` removidos (Tarefa 12); `paths` mantido com prefixo
  `"./"` explícito (exigido pelo `tsc` sem `baseUrl`); `tsc --noEmit` e `expo export --platform ios`
  confirmam que o alias `@/` continua resolvendo pelo Metro/`babel-preset-expo`.
- Perfil usa o fuso da última previsão da cidade selecionada (guardado em `prefs:v1`) para
  calcular "hoje" — mesma base de `useToday` usada em Hoje.
- `/day/[date]` e `plansByDate`: implementados no domínio de gamificação, permitindo planejar e
  consultar um dia diferente de hoje (usado pelo detalhe do dia de amanhã).
- Seletor de hora para "Registrar atividade" e minuto real no texto "Concluído às Xh": ambos
  implementados (Tarefas 1/4/7 deste plano).
- Funções de tela acima de 50 linhas (`HomeScreen.tsx`, `CitiesScreen.tsx`): extraídas em
  subcomponentes ao construir o design system.
- MSW para testes de tela com HTTP real: `HomeScreen.msw.test.tsx` (Tarefa 11), cobrindo caminho
  feliz, erro HTTP 503 e resposta fora do schema contra `createOpenMeteoGeocoding`/
  `createOpenMeteoForecast` de verdade.

## Notas da Tarefa 11 (MSW) para quem mexer nisso de novo

- `msw` está fixado em `2.10.5` (não `^2.15`/latest): a partir da série `2.11`, o pacote passou a
  depender de `rettime`, que só publica build ESM (`"type": "module"`, sem condição `require` nos
  `exports`). Sob o Jest deste projeto (CJS, `transformIgnorePatterns` restrito às libs RN), isso
  quebra com `SyntaxError: Cannot use import statement outside a module` ao importar `msw`/`msw/node`.
  Antes de atualizar `msw`, checar se `rettime` já publicou build CJS ou se `transformIgnorePatterns`
  precisa crescer para cobrir `rettime` (e transformar `.mjs`, que o transform atual não cobre).
- `moduleNameMapper` em `apps/mobile/package.json` mapeia `msw/node` direto para
  `node_modules/msw/lib/node/index.js`: o resolver de pacotes do Jest (com `node-linker=hoisted`,
  sem `.pnpm`) não resolveu o subpath `./node` do `exports` do msw sozinho.
- `apps/mobile/src/presentation/testing/msw/msw-node.d.ts` declara o módulo `msw/node` ambiente
  (sem importar o `.d.ts` real do pacote) porque o `tsc` deste projeto usa
  `moduleResolution: "bundler"` com `customConditions: ["react-native"]`, e o `exports` do msw
  bloqueia esse subpath sob a condição `"react-native"` (`"react-native": null` no mapa de
  `./node`); apontar `paths` direto para o `.d.ts` do pacote fazia o TypeScript enxergar dois tipos
  `RequestHandler` estruturalmente iguais mas nominalmente distintos (erro de propriedade privada
  `__kind`).
- `eslint.config.js` ganhou uma exceção de fronteira estreita (`presentation-e2e-testing`) só para
  `presentation/testing/msw/**` e `presentation/**/*.msw.test.tsx`: é o único ponto da camada de
  apresentação autorizado a importar `infrastructure` diretamente. Não generalizar essa exceção.

## Para o Plano 4

- **BFF e config remota nos casos de uso de gamificação**: hoje `defaultEngineConfig` é estático em
  `domain/config`; quando o Plano 4 introduzir o BFF, a config (pesos de score, XP, níveis) deve
  vir do backend e ser injetada via `EngineConfigProvider` nos casos de uso de gamificação
  (`confirmActivity`, `logActivity`, `planActivity`, `getProgress`), sem mudar as assinaturas dos
  ports.
- **CI com lint dos arquivos de configuração**: `expo lint` não cobre `eslint.config.js`/
  `jest.setup.js` (ficam fora de `src/`); configurar isso explicitamente no CI do Plano 4.
- **`env.ts`: modo `bff` com URL inválida deve falhar alto**: hoje degrada silenciosamente para
  `direct` com aviso de log; quando o BFF de verdade existir, isso deve ser um erro visível.
- **Retry/skeleton em Cidades**: a busca de cidades (`useCitySearch`) não tem estado de retry
  explícito nem skeleton de carregamento — hoje só "carregando"/"erro" em texto; vale alinhar com o
  padrão de `OverviewStatus` (mensagem + botão "Tentar de novo") quando o Plano 4 trouxer o BFF com
  cache (latência maior, mais chance de erro intermitente).
- **Ramos sem fixture (cobertura de branch abaixo de 100 %, não bloqueia o global ≥ 80 %)**:
  - `MonthCalendar.tsx` (75 % branch, linha 37): falta um dia com `state === 'rest'` num teste, que
    exercitaria o `styles.restBorder` extra aplicado às células de folga.
  - `BadgeDetail.tsx` (75 % branch, linhas 11/26): falta o caso de uma badge já `unlocked` (o early
    return de `criterionLabel` por `badge.unlocked`, hoje só testado pelo lado `progress === null`).
  - `CityResults.tsx` (66,66 % branch / 71,42 % linha, linhas 37-41): falta um teste com
    `favorites`/`recents` não vazios exercitando o `ListFooterComponent` (`CitySection` de
    favoritas), hoje só coberto com listas vazias.

## Minors diferidos (fazer se sobrar tempo)

- `presentation/queries/useOverview.ts` (88,88 % linha/statement) e `useForecast.ts` (88,88 %) têm
  ramos de erro sem teste direto de hook isolado (cobertos indiretamente pelas telas).
- Caminhos animados e o mock global de movimento reduzido: `jest.setup.js` força
  `useReducedMotion() === true` em toda a suíte, então nenhum teste de tela passa pelas animações.
  Só `presentation/ui/Sky.motion.test.tsx` desliga esse padrão (mock por arquivo) e cobre o
  crossfade do céu de ponta a ponta, incluindo o `runOnJS(setPrevious)` do fim da transição —
  `Sky.tsx` fica em 100 % de linha e 90 % de ramo (falta só o `done === false` do callback). Os
  caminhos animados de `LevelBar`, `Reveal`, `NowOutline` e `CountUp` continuam sem cobertura
  dentro das telas; replicar a mesma receita de mock por arquivo para eles fica para o Plano 4.
