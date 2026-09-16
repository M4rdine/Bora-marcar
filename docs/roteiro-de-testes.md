# Roteiro de testes no aparelho — Bora marcar

Feito para rodar no iPhone pelo Expo Go, com o app ligado à API de produção ou à Open-Meteo
direto. O objetivo não é só achar erro: é **coletar feedback de interface com contexto**, para
a fase de redesenho.

## Como abrir

1. Instale o **Expo Go** (App Store).
2. Com o servidor de pé na mesma rede, abra `exp://192.168.0.22:8081` no Expo Go (ou aponte a
   câmera para o QR code do terminal).
3. Se o IP mudar, peça um novo. O app abre em modo `direct`, falando direto com a Open-Meteo.

## Como anotar

Para cada item, anote **o que incomodou** e **o que você esperava**. Frases curtas bastam.
Print da tela ajuda muito: no iPhone, botão lateral + volume para cima.

Três categorias, use a que couber:

- **Erro** — está quebrado ou faz a coisa errada.
- **Atrito** — funciona, mas demorou, confundiu ou exigiu pensar.
- **Aparência** — funciona e é claro, mas parece genérico, sem personalidade, mal acabado.

A terceira categoria é a mais importante agora. Seja impiedoso nela.

---

## Parte 1 — Primeiro contato (o que um avaliador vê)

Faça esta parte **sem pular nada** e, se puder, cronometrando.

| #   | Ação                          | O que observar                                                                 |
| --- | ----------------------------- | ------------------------------------------------------------------------------ |
| 1.1 | Abra o app pela primeira vez  | A primeira tela explica o que o app faz? Em quanto tempo você entendeu?        |
| 1.2 | Leia o cartão "Como funciona" | Os três passos ajudam ou são enfeite?                                          |
| 1.3 | Toque em "Buscar cidade"      | A transição parece do app ou parece web?                                       |
| 1.4 | Digite "São" e espere         | O tempo até aparecer resultado incomoda? O esqueleto de carregamento convence? |
| 1.5 | Olhe a lista de resultados    | Dá para distinguir as cidades repetidas? A bandeira ajuda ou polui?            |
| 1.6 | Escolha São Paulo             | A volta para a tela principal tem transição? Parece instantâneo ou travado?    |

**Pergunta-chave da parte 1:** se você não conhecesse o app, teria entendido o que ele faz
antes de escolher a cidade?

---

## Parte 2 — A tela principal (onde o app vive)

| #    | Ação                                                      | O que observar                                                                              |
| ---- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 2.1  | Olhe a tela inteira sem tocar em nada, por 10 segundos    | O que seu olho lê primeiro? É o que deveria?                                                |
| 2.2  | Leia o cartão do topo                                     | O horário recomendado se destaca o suficiente? A frase explicativa soa natural ou robótica? |
| 2.3  | Olhe os quatro números (sensação, chuva, vento, UV)       | São legíveis? Os emojis ajudam ou parecem preguiça?                                         |
| 2.4  | Troque a atividade (Corrida, Ciclismo, Praia, Piquenique) | A mudança é perceptível? O número no chip faz sentido?                                      |
| 2.5  | Role até a linha do dia                                   | As barras coloridas comunicam? Você entende a legenda sem pensar?                           |
| 2.6  | Ache o marcador de "agora"                                | Achou rápido? Ele se destaca o suficiente?                                                  |
| 2.7  | Olhe o arco do sol e os horários                          | Isso agrega ou é enfeite?                                                                   |
| 2.8  | Role até "Próximos dias"                                  | Dá para comparar os dias de relance? O selo "melhor da semana" funciona?                    |
| 2.9  | Toque num dia futuro                                      | A tela do dia parece a mesma família visual?                                                |
| 2.10 | Volte e olhe a faixa de sequência e o anel de nível       | A gamificação parece integrada ou colada por cima?                                          |

**Pergunta-chave da parte 2:** que parte desta tela você apagaria sem sentir falta?

---

## Parte 3 — O ciclo que é o coração do app

| #   | Ação                                                           | O que observar                                                               |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 3.1 | Toque em "Planejar"                                            | O botão dá retorno ao toque? A troca de estado é suave ou seca?              |
| 3.2 | Leia o estado "Planejado"                                      | A contagem regressiva e o lembrete fazem sentido ali?                        |
| 3.3 | Feche o app e reabra                                           | A cidade e o plano continuam? Quanto tempo até a tela aparecer?              |
| 3.4 | Espere o lembrete (30 min antes da janela)                     | **Chegou notificação?** Se não chegou, isso é o erro mais importante do dia. |
| 3.5 | Confirme "Confirmar que fui"                                   | A recompensa parece merecida ou exagerada?                                   |
| 3.6 | Leia o recibo de experiência                                   | As parcelas são claras? A conta fecha na sua cabeça?                         |
| 3.7 | Veja a conquista desbloqueada                                  | Emociona ou parece adesivo de IA?                                            |
| 3.8 | Toque em "Desfazer plano" (antes de confirmar, num plano novo) | O que acontece é o que você esperava?                                        |

**Pergunta-chave da parte 3:** você voltaria amanhã por vontade própria?

---

## Parte 4 — Perfil e história

| #   | Ação                             | O que observar                                                            |
| --- | -------------------------------- | ------------------------------------------------------------------------- |
| 4.1 | Abra o Perfil                    | O que ele responde de cara? É a pergunta certa?                           |
| 4.2 | Olhe o calendário do mês         | Os dias marcados se distinguem? O dia de hoje aparece?                    |
| 4.3 | Toque numa conquista bloqueada   | O progresso aparece na célula e no detalhe?                               |
| 4.4 | Toque na mesma conquista de novo | Fecha?                                                                    |
| 4.5 | Olhe o histórico                 | A linha da atividade conta uma história ou é uma linha de banco de dados? |

---

## Parte 5 — Quando dá errado

| #   | Ação                                         | O que observar                                     |
| --- | -------------------------------------------- | -------------------------------------------------- |
| 5.1 | Ative o modo avião e abra o app              | A mensagem de erro ajuda? Tem como tentar de novo? |
| 5.2 | Ainda offline, toque em "Tentar de novo"     | O retorno é imediato e claro?                      |
| 5.3 | Volte a rede e tente de novo                 | Recupera sozinho?                                  |
| 5.4 | Busque uma cidade que não existe ("Xyzabc")  | A mensagem é útil?                                 |
| 5.5 | Em Cidades, negue a permissão de localização | A mensagem explica o que fazer?                    |

---

## Parte 6 — Acessibilidade e conforto (rápida, mas reveladora)

| #   | Ação                                                     | O que observar                                                           |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| 6.1 | Ajustes → Tela e Brilho → Texto maior, aumente bastante  | O que quebra? Algum texto some ou corta?                                 |
| 6.2 | Ative o VoiceOver e navegue pela tela principal          | A ordem de leitura faz sentido? O recibo de XP é lido de forma estranha? |
| 6.3 | Em Cidades, com VoiceOver, chegue numa linha de cidade   | Escolher a cidade e favoritar são dois botões separados?                 |
| 6.4 | Ajustes → Acessibilidade → Movimento → Reduzir movimento | O app continua utilizável e coerente?                                    |
| 6.5 | Use o app no sol, se der                                 | O contraste do gradiente aguenta?                                        |

---

## Parte 7 — O teste que mais importa para o redesenho

Depois de tudo, responda com sinceridade:

1. Se este app estivesse na App Store ao lado de outros três de clima, **você baixaria**? Por quê?
2. Qual tela parece **mais genérica**? Qual parece **mais autoral**?
3. Se você tivesse que descrever a personalidade visual do app em três palavras, quais seriam?
   E quais você **gostaria** que fossem?
4. Tem algum app (de qualquer categoria) cuja interface você queria que a gente perseguisse?
   Nome e o que especificamente te agrada nele.
5. O que, olhando agora, mais grita "isso foi feito por uma IA sem cuidado"?

A pergunta 4 é a mais valiosa: uma referência concreta vale mais que dez adjetivos.

---

## Já conhecido, não precisa reportar

- O aviso vermelho "Falha ao cancelar lembrete" só aparece na versão web, onde notificação não
  existe. No aparelho não aparece.
- Na versão web não há notificação nenhuma; use o aparelho para testar o lembrete.
- Emoji nas abas não muda de cor entre ativa e inativa; hoje a distinção é por opacidade e
  tamanho. Se ainda assim ficar ruim no aparelho, reporte.
