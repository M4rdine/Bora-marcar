process.env.TZ = 'UTC';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

require('react-native-reanimated').setUpTests();

// Movimento reduzido por padrão nos testes de tela: evita que animações JS-driven (CountUp) ou
// baseadas em timers (Sky, LevelBar, Reveal) deixem asserções de texto/estado flakeys. Arquivos
// que precisam testar o caminho animado isoladamente sobrescrevem este mock localmente com
// `jest.mock('./useReducedMotion', () => ({ useReducedMotion: jest.fn() }))` (o mock por arquivo
// tem prioridade sobre este, registrado em setupFiles).
jest.mock('@/presentation/ui/useReducedMotion', () => ({ useReducedMotion: () => true }));
