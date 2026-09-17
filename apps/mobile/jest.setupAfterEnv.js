const { configure } = require('@testing-library/react-native');

/**
 * Teto de espera das consultas assíncronas (`findBy*`, `waitFor`).
 *
 * O padrão da biblioteca é 1 segundo, e ele passou a estourar de forma intermitente conforme as
 * telas ficaram mais pesadas: a cronologia renderiza 24 linhas com ícone vetorial cada, e sob
 * carga de workers paralelos um render de 60 ms vira 2 segundos. As falhas apareciam em testes
 * diferentes a cada rodada e sumiam ao rodar o arquivo isolado — sintoma de contenção, não de
 * defeito.
 *
 * Cinco segundos continua bem abaixo do `testTimeout` de 15, então uma espera que de fato pendure
 * ainda falha; o que deixa de falhar é a máquina ocupada.
 */
configure({ asyncUtilTimeout: 5000 });
