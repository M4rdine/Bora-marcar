# Registro de decisões de arquitetura (ADRs)

Cada ADR segue o formato Status / Contexto / Decisão / Consequências.

| ADR                                             | Decisão                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [0001](0001-expo-managed.md)                    | Expo managed workflow, Expo Go como alvo do avaliador                                          |
| [0002](0002-hexagonal-leve.md)                  | Arquitetura hexagonal leve com quatro camadas (domain/application/infrastructure/presentation) |
| [0003](0003-event-sourcing-local.md)            | Event sourcing local para a gamificação (`deriveProgress`)                                     |
| [0004](0004-bff-com-cache-redis.md)             | BFF com cache Redis na frente da Open-Meteo                                                    |
| [0005](0005-config-remota-do-motor.md)          | Config remota do motor de recomendação (`engine.json`)                                         |
| [0006](0006-fallback-direto-por-env.md)         | Fallback direto por variável de ambiente (`EXPO_PUBLIC_API_MODE`)                              |
| [0007](0007-motor-no-dispositivo.md)            | Motor de recomendação no dispositivo, não no servidor                                          |
| [0008](0008-nginx-existente-em-vez-de-caddy.md) | nginx existente em vez de Caddy como borda da VPS                                              |

Todas aceitas; nenhuma foi revertida ou substituída até aqui.
