# 0005 — Config remota do motor de recomendação

## Status

Aceito

## Contexto

Ajustar pesos, faixas térmicas ou limiares de XP hoje exige publicar uma nova versão do
app. Ao mesmo tempo, nem tudo deveria virar dado remoto: as curvas de conforto e os
descritores em PT-BR precisam continuar legíveis no repositório — é exatamente o que o
teste técnico pede para explicar a lógica de recomendação.

## Decisão

`engine.json` concentra o que é **dado** ajustável remotamente: perfis de atividade
(faixas térmicas, limites de vento/UV, fator noturno, pesos), limiares de rótulo de score,
regras de janela, limiares das dicas de preparo e regras de XP/níveis. O schema é Zod
compartilhado (`packages/contracts/src/engineConfig.ts`, `engineConfigSchema`,
`schemaVersion: 1`) com invariantes reforçadas no schema (pesos somam 1, `tolMin < idealMin
≤ idealMax < tolMax`, `great > good > fair`, níveis crescentes a partir de 0 XP). As curvas
de conforto (`comfort.ts`), os descritores PT-BR (`descriptors.ts`), as ressalvas
(`sentence.ts`, `tips.ts`) e as regras de badges (`badges.ts`) continuam **código**,
versionado com o app. O app baixa `${ASSETS_URL}/config/v1/engine.json`
(`remoteEngineConfigProvider.ts`), cacheia por 24 h, valida com o mesmo schema e guarda a
última cópia válida; sem rede ou com schema inválido usa essa última cópia e, sem nenhuma
cópia salva, a config embutida (`defaultEngineConfig`). Uma falha de rede ou schema também
liga um cache negativo de 5 min, para não reabrir o timeout a cada caso de uso durante uma
indisponibilidade. O domínio recebe a config como parâmetro — nunca lê de rede ou storage.

## Consequências

Custo: dois lugares precisam ficar em sincronia (o schema Zod e o `EngineConfig` do
domínio) — mitigado por importar o mesmo schema compartilhado dos dois lados. Benefício:
publicar um ajuste de peso ou limiar é subir um JSON (`publish-assets.yml` +
`publish-config.sh`), não uma nova versão do app; o app funciona offline com a última cópia
válida; o avaliador, que roda em `direct`, nunca depende disso — usa sempre a config
embutida.
