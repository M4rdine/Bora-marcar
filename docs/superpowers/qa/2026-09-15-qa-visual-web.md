# QA visual no alvo web — 2026-09-15

Spike aprovado após o Plano 3: renderizar o app com `react-native-web` em Chrome headless
(emulação de iPhone 390×844, DPR 2, via Chrome DevTools Protocol) e comparar com o mockup
aprovado `docs/superpowers/mockups/home-rich-v3.html`. Capturas em `2026-09-15-web/`.

Ferramenta: `tools/qa-web/` (script CDP que sobe o Chrome, emula o dispositivo, navega, toca em
textos, semeia `localStorage` e intercepta a resposta do Open-Meteo para forçar cenários como
"dia inteiro de chuva"). O servidor é `pnpm --filter mobile exec expo start --web --port 8090`.

## Estados capturados

| Captura               | Estado                                         | Como foi obtido                                  |
| --------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `01-home-welcome`     | boas-vindas                                    | storage limpo                                    |
| `03-cities-results`   | busca "São Paulo"                              | API real                                         |
| `04-home-city-top`    | herói `plan` (0h em São Paulo)                 | seleção real                                     |
| `08-home-planned`     | herói `planned`                                | toque em "Planejar Caminhada às 11h"             |
| `15-home-confirm`     | herói `confirm` (13h em Tóquio, plano das 11h) | troca de cidade com plano do dia                 |
| `17-home-done`        | herói `done` + recibo + conquista              | "Confirmar que fui"                              |
| `23-home-nowindow`    | herói `noWindow`                               | resposta do Open-Meteo interceptada (chuva 48 h) |
| `09-day-tomorrow-top` | `/day/[date]` de amanhã                        | toque na linha "Amanhã"                          |
| `25-profile-progress` | Perfil com 1 atividade                         | `progress:v1` semeado                            |

Também vistos, sem captura guardada: seletor de hora, `logNoPlan` com janela em andamento,
Cidades vazia, Perfil sem histórico.

## Veredito geral

A Home com cidade está muito próxima do mockup: cabeçalho com orb de nível, faixa de sequência
com os sete dias, chips de atividade com score, herói com kicker/pílula/horário gigante/frase/
quatro fatores/dicas/CTA com subtexto, linha do dia com arco do sol e legenda, próximos dias com
"melhor da semana". Perfil e Cidades seguem o sistema. Os problemas são pontuais, listados
abaixo com a decisão tomada para cada um.

## Achados e decisões (rodada de correções `fix/qa-visual-1`)

### Motor de recomendação

1. **Janela de madrugada recomendada.** Em Tóquio, "Amanhã · 1h – 4h · chuva · 50" e o CTA
   "Planejar amanhã às 1h": com o resto do dia chovendo, o `nightFactor` (0,7 na caminhada) só
   reduz o score e a madrugada vence. Ninguém quer uma caminhada às 1h recomendada.
   **Decisão:** veto `night` (teto 20, mesmo da chuva) para horas antes das 5h; entra na lista
   de motivos ("madrugada"). Constante no domínio, documentada na spec (§4.2).

### Home

2. **Brilho do herói opaco.** O disco dourado a 35 % vira um círculo marrom (céu noturno) ou
   cinza-esverdeado (céu de dia). O mockup usa `radial-gradient` que se dissolve.
   **Decisão:** `HeroGlow` com quatro círculos concêntricos de alfa decrescente (sem SVG).
3. **Número do orb invisível.** `LevelOrb` pinta o número em `ink` sobre fundo `ink`.
   **Decisão:** número em branco (como no mockup `.orb b`).
4. **"PLANEJADO / Planejado para as 11h"** repete a palavra. **Decisão:** título vira
   "Caminhada às 11h" (atividade do plano); o kicker continua "Planejado".
5. **Estado `confirm` magro** (kicker, horário, pílula, botões) e a pílula "Agora · 20" sem cor.
   **Decisão:** acrescenta a linha da atividade, os quatro fatores da janela e pinta a pílula
   pelo rótulo do score.
6. **Estado `done`:** kicker sem a atividade, recibo sem os emojis do mockup, barra de nível com
   "10 XP" ambíguo. **Decisão:** "Caminhada concluída · 13h00"; linhas do recibo com 🏃 🌤 🎯 🔥;
   barra com "90 / 100 XP".
7. **Hierarquia dos botões em `noWindow`** (pendência do Plano 3). **Decisão:** o atalho
   "Amanhã: 11h–14h, ótimo" é o botão primário quando existe; "Saí em outro horário" fica
   `quiet`. Sem atalho, "Saí em outro horário" volta a ser primário.
8. **Plano de outra cidade.** Com plano feito em São Paulo, Tóquio mostra "Sua janela começou
   11h – 14h" como se fosse dali. O plano é por dia (spec), então o herói continua mostrando,
   mas **decisão:** linha discreta "Plano feito em outra cidade" quando `plan.cityId` difere.
9. **Cabeçalho "São Paulo, São Paulo".** **Decisão:** quando `admin1` repete o nome (ou falta),
   mostra o país: "São Paulo, Brasil". Chevron `⌄` trocado por `▾`, alinhado ao texto.
10. **Seletor de hora abre no 0h** e o chip selecionado (hora atual) fica fora da tela.
    **Decisão:** chips em ordem decrescente (hora atual primeiro).
11. **Boas-vindas vazia** (título, frase, dois botões e 70 % da tela em gradiente).
    **Decisão:** cartão "Como funciona" com três passos (🔍 cidade → 🌤 previsão hora a hora →
    🏅 planejar, sair e ganhar XP), no mesmo sistema visual; testes dos CTAs (pendência).

### Tela do dia

12. **Kicker "MELHOR HORÁRIO HOJE" em amanhã.** `PlanSection` reaproveita `HeroBody`.
    **Decisão:** `HeroBody` aceita `kicker` opcional; a tela do dia passa "Melhor horário".
13. **Arco do sol sem horários** fora de hoje: `SunArc` some com os rótulos quando não há
    "agora". **Decisão:** rótulos de nascer/pôr sempre; só o marcador depende do "agora".

### Próximos dias

14. **"Sem janela boa hoje" numa linha de amanhã.** **Decisão:** linhas usam "Sem janela boa"
    seguido do motivo dominante ("Sem janela boa · chuva").

### Cidades

15. **Resultados duplicados** ("São Paulo, Distrito de Coimbra, Portugal" três vezes; o Open-Meteo
    devolve feature codes distintos). **Decisão:** `searchCities` remove duplicatas por
    nome + admin1 + país, mantendo a primeira.

### Perfil

16. **Placar repete o número** ("1" e "1 atividades") e erra o plural ("1 atividades",
    "1 cidades", "1 dias ativos"). **Decisão:** rótulos sem número e com plural correto.

### Fora da rodada (anotado)

- No web, `expo-notifications` não agenda lembretes e o `logger.error` vira LogBox vermelho em
  dev. Só afeta o alvo web; em produção nada aparece. Fica como está.
- A barra de abas flutuante cobre o conteúdo durante a rolagem; é o comportamento esperado de
  barra flutuante e o `padding` final está correto.
- Área segura superior não existe no web (0 px); no aparelho o `SafeAreaView` cuida.

## Depois da rodada

Capturas após as correções em `2026-09-15-web-depois/` (mesmos cenários, geradas com
`tools/qa-web/scenarios/home-states.js`): boas-vindas com "Como funciona", herói `plan` com
"São Paulo, Brasil" e orb legível, `confirm` com atividade/pílula colorida/aviso de outra cidade,
`done` com recibo ilustrado e "90 / 100 XP", `noWindow` com o atalho de amanhã como primário,
tela do dia com kicker neutro e horários do sol, Perfil com plurais corretos.

## Alvo web

Mantido como alvo de QA (não de entrega): `react-native-web` e `react-dom` ficam nas
dependências, e o harness em `tools/qa-web/` documenta como repetir as capturas.
