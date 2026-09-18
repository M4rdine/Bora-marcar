process.env.TZ = 'UTC';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

require('react-native-reanimated').setUpTests();

// O ambiente do jest-expo não tem o runtime de UI dos worklets: montar a raiz de gestos ali
// estoura com `getUIRuntimeHolder is not supported on web`, e sem a raiz todo `GestureDetector`
// recusa a renderizar. Trocamos SÓ esses dois por equivalentes inertes e mantemos o resto da
// biblioteca real, que é de onde a navegação tira `Swipeable`, `State` e companhia.
//
// O gesto em si não é exercitado aqui — um arrasto não existe neste ambiente. O que pode dar
// errado nele é a REGRA de para onde ir, e essa é testada à parte, em `daySwipe.test.ts`.
// O ambiente do jest-expo não tem o runtime de UI dos worklets, e o gesture-handler agenda a
// instalação dos bindings assim que o módulo CARREGA — `requireActual` já basta para estourar com
// `getUIRuntimeHolder is not supported on web`. Por isso o módulo é substituído por inteiro.
//
// O gesto em si não é exercitado aqui: um arrasto não existe neste ambiente. O que pode dar errado
// nele é a REGRA de para onde ir, e essa é testada à parte, em `daySwipe.test.ts`.
jest.mock('react-native-gesture-handler', () => {
  const { ScrollView, View } = require('react-native');
  // Construtor de gesto encadeável e inerte: qualquer método devolve ele mesmo.
  const chainable = () => {
    const handler = { get: () => () => proxy };
    const proxy = new Proxy({}, handler);
    return proxy;
  };
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => children,
    Gesture: new Proxy({}, { get: () => chainable }),
    ScrollView,
    State: {},
    Directions: {},
    gestureHandlerRootHOC: (c) => c,
  };
});

// Movimento reduzido por padrão nos testes de tela: evita que animações JS-driven (CountUp) ou
// baseadas em timers (Sky, LevelBar, Reveal) deixem asserções de texto/estado flakeys. Arquivos
// que precisam testar o caminho animado isoladamente sobrescrevem este mock localmente com
// `jest.mock('./useReducedMotion', () => ({ useReducedMotion: jest.fn() }))` (o mock por arquivo
// tem prioridade sobre este, registrado em setupFiles).
jest.mock('@/presentation/ui/useReducedMotion', () => ({ useReducedMotion: () => true }));
