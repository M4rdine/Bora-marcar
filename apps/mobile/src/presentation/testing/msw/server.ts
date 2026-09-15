import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * Servidor MSW compartilhado pelos testes ponta a ponta (Tarefa 11): intercepta o `fetch` real dos
 * adapters `infrastructure/openMeteo` em vez de portas falsas. `onUnhandledRequest: 'error'` faz
 * qualquer chamada não coberta por um handler falhar o teste, em vez de vazar para a rede.
 */
export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
