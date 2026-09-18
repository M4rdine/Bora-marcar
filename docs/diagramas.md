# Diagramas

Blocos Mermaid prontos para copiar. Colar em <https://mermaid.live> para exportar PNG/SVG, ou
usar direto no GitHub, Notion e slides que aceitam Mermaid.

Cada diagrama responde a uma pergunta. Se ele não responde a nenhuma, não deveria estar num
slide.

---

## 1. O caminho de um dado

**Responde:** por onde passa uma previsão até virar uma nota na tela, e por que cada etapa
existe.

```mermaid
flowchart LR
  subgraph Aparelho["Aparelho"]
    direction TB
    UI["Telas<br/>presentation"]
    Motor["Motor de recomendação<br/>domain · puro"]
    Ports["Ports<br/>application"]
    Adapters["Adapters<br/>infrastructure"]
    UI --> Ports
    Ports --> Motor
    Ports --> Adapters
  end

  subgraph VPS["VPS"]
    direction TB
    Nginx["nginx + certbot<br/>TLS · proxy_cache"]
    BFF["BFF Hono"]
    Redis[("Redis<br/>fc:v1 15 min<br/>geo:v1 24 h")]
    MinIO[("MinIO<br/>engine.json")]
    Nginx --> BFF
    Nginx --> MinIO
    BFF --> Redis
  end

  OM[("Open-Meteo<br/>sem chave, sem custo")]

  Adapters -- "modo bff" --> Nginx
  Adapters -- "modo direto" --> OM
  BFF --> OM

  classDef puro fill:#1B1C42,stroke:#4FDF95,stroke-width:2px,color:#fff
  class Motor puro
```

**O que dizer:** o mesmo port `ForecastProvider` tem dois adapters de verdade. O avaliador
roda o app sem subir infraestrutura nenhuma, e é o mesmo código de domínio nos dois modos.

---

## 2. A regra de dependência

**Responde:** por que este projeto não é "uma pasta chamada domain".

```mermaid
flowchart TB
  App["app<br/><small>rotas do Expo Router</small>"]
  Pres["presentation<br/><small>telas, design system, estado</small>"]
  Infra["infrastructure<br/><small>Open-Meteo, BFF, AsyncStorage, notificações</small>"]
  Appl["application<br/><small>ports e casos de uso</small>"]
  Dom["domain<br/><small>regras puras · zero dependências</small>"]

  App --> Pres
  Pres --> Appl
  Infra --> Appl
  Appl --> Dom

  MSW["presentation/testing/msw<br/><small>exceção declarada</small>"] -.-> Infra

  classDef puro fill:#1B1C42,stroke:#4FDF95,stroke-width:2px,color:#fff
  classDef excecao stroke-dasharray: 4 4
  class Dom puro
  class MSW excecao
```

**O que dizer:** as setas apontam só para dentro, e quem impõe isso é o
`eslint-plugin-boundaries` mais um `no-restricted-imports` que proíbe React, Expo, TanStack e
AsyncStorage dentro de `domain` e `application`. Quebrar a direção falha o lint, não a revisão
de código. A única exceção está escrita na configuração, com o motivo ao lado.

---

## 3. Como uma hora vira uma nota

**Responde:** o que o motor faz, e por que a média ponderada sozinha mentiria.

```mermaid
flowchart TB
  H["Hora da previsão<br/><small>sensação, chuva, vento, UV, nuvens, pressão</small>"]

  H --> T["térmico"]
  H --> C["chuva"]
  H --> V["vento"]
  H --> U["UV"]
  H --> S["sol"]
  H --> P["pressão<br/><small>tendência de 3h</small>"]

  T --> W{{"× peso do perfil"}}
  C --> W
  V --> W
  U --> W
  S --> W
  P --> W

  W --> Base["soma = Σ peso × conforto"]
  Base --> Luz["× fator noturno<br/><small>1 de dia</small>"]
  Luz --> Fog["× 0,6<br/><small>só ciclismo com nevoeiro</small>"]
  Fog --> Veto{"algum veto?"}
  Veto -- "não" --> Nota["Nota 0–100"]
  Veto -- "sim" --> Teto["nota = min(nota, teto)<br/><small>trovoada 0 · chuva e neve 20 · térmico 30</small>"]
  Teto --> Nota

  classDef destaque fill:#1B1C42,stroke:#FFD66B,stroke-width:2px,color:#fff
  class Veto,Teto destaque
```

**O que dizer:** vetos são **tetos, não penalidades**. Uma hora com trovoada e todo o resto
perfeito ainda tiraria nota alta numa média ponderada — por isso o teto vem depois da soma, e o
menor vence.

---

## 4. A pressão, e por que ela não cabia na função de conforto

**Responde:** a decisão de desenho mais interessante do projeto.

```mermaid
flowchart LR
  subgraph Mapeamento["mapForecast · packages/contracts"]
    direction TB
    Serie["série horária<br/>pressure_msl"]
    Trend["pressureTrendHpa<br/><small>h − h−3</small>"]
    Serie --> Trend
  end

  subgraph Motor["domain · puro"]
    direction TB
    Comfort["pressureComfort(tendência)"]
    Peso["× peso da atividade"]
    Comfort --> Peso
  end

  Trend -- "chega como DADO" --> Comfort

  BFF["BFF"] --> Mapeamento
  Direto["Adapter direto"] --> Mapeamento

  classDef puro fill:#1B1C42,stroke:#4FDF95,stroke-width:2px,color:#fff
  class Motor puro
```

**O que dizer:** o que importa a quem pesca é a **tendência**, não o valor — 1022 hPa não diz
nada sozinho, mas caindo 3 em três horas significa frente chegando. Só que tendência precisa das
horas vizinhas, e o motor pontua uma hora de cada vez. Calcular dentro da função de conforto
exigiria passar a série inteira e acabar com a pureza do domínio. Então o derivado nasce no
mapeamento — que o BFF e o adapter direto compartilham: uma implementação, os dois caminhos.

---

## 5. Gamificação: nenhum número é gravado

**Responde:** por que não há contador para dessincronizar.

```mermaid
flowchart LR
  subgraph Log["progress:v1 · log imutável"]
    direction TB
    E1["planned"]
    E2["confirmed"]
    E3["logged"]
    E4["planCancelled"]
    E5["badWeatherDay"]
  end

  Log --> D["deriveProgress()"]

  D --> XP["XP e nível"]
  D --> Streak["sequência<br/><small>mau tempo não quebra</small>"]
  D --> Badges["8 conquistas"]
  D --> Planos["planos pendentes<br/><small>por data E atividade</small>"]
  D --> Hoje["registros de hoje"]

  classDef derivado stroke-dasharray: 4 4
  class XP,Streak,Badges,Planos,Hoje derivado
```

**O que dizer:** tudo à direita é **derivado a cada leitura**. Não há contador para
dessincronizar, não há migração quando uma regra de XP muda, e o recibo que a tela mostra é a
mesma conta que o domínio fez. O trade-off assumido está na ADR 0005: mudar os pesos remotamente
recalcula o passado.

---

## 6. Ciclo do usuário

**Responde:** o fluxo que a demonstração vai percorrer.

```mermaid
stateDiagram-v2
  [*] --> SemPlano: abre o app

  SemPlano --> Planejado: planejar janela
  SemPlano --> Concluido: registrar sem plano

  Planejado --> Confirmar: chega a hora
  Planejado --> SemPlano: desfazer

  Confirmar --> Concluido: confirmar que fui
  Confirmar --> Concluido: saí em outro horário

  Concluido --> SemPlano: registrar outra atividade
  Concluido --> [*]: planejar amanhã

  SemPlano --> HorasPassaram: as boas horas acabaram
  HorasPassaram --> Concluido: registrar mesmo assim
  HorasPassaram --> [*]: planejar amanhã

  note right of Concluido
    Um dia aceita mais de uma.
    A segunda rende XP menos
    o bônus de sequência.
  end note
```

---

## 7. Entrega

**Responde:** o que acontece entre o push e a produção.

```mermaid
flowchart LR
  Push["push em main"] --> CI{"CI · 5 jobs"}

  CI --> F["format"]
  CI --> Ct["contracts<br/>lint · types · vitest"]
  CI --> B["bff<br/>lint · types · vitest · build"]
  CI --> M["mobile<br/>lint · types · jest"]
  CI --> Dk["docker<br/>build da imagem, sem publicar"]

  F --> Ok{"verde?"}
  Ct --> Ok
  B --> Ok
  M --> Ok
  Dk --> Ok

  Ok -- "sim" --> Deploy["deploy-bff<br/><small>GHCR → VPS</small>"]
  Ok -- "não" --> Para["para aqui"]

  Assets["publish-assets<br/><small>engine.json → MinIO</small>"] -.-> Manual["manual, ritmo próprio"]

  classDef falha fill:#1B1C42,stroke:#FF9B8A,stroke-width:2px,color:#fff
  class Para falha
```

**O que dizer:** o job `docker` constrói a imagem do BFF **sem publicar**. Falha ali é falha
antes do deploy, não durante. E publicar a configuração do motor é um fluxo separado: mudar um
peso de atividade não reinicia o servidor.
