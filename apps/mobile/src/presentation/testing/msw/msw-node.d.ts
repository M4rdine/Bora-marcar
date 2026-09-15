/**
 * O mapa de `exports` do pacote `msw` bloqueia de propósito o subpath `./node` sob a condição
 * `"react-native"` (customCondition deste projeto): é um build só de Node, não para o app RN. Sem
 * este shim, `tsc` não encontra `msw/node`, e apontar `paths` direto para o `.d.ts` real do pacote
 * faz o TypeScript enxergar dois `RequestHandler` estruturalmente iguais, mas declarados em
 * "famílias" de tipos diferentes (erro de propriedade privada `__kind` duplicada). Declarando o
 * módulo aqui e reaproveitando o `RequestHandler` já importado de `msw` (mesma instância de tipo
 * usada por `http`/`HttpResponse`), os dois lados do teste MSW (`presentation/testing/msw/server.ts`
 * e `HomeScreen.msw.test.tsx`) ficam com uma única família de tipos consistente. Em runtime, quem
 * resolve `msw/node` de verdade é o `moduleNameMapper` do Jest (`package.json`), que já contorna o
 * mesmo bloqueio de `exports` para a execução.
 *
 * Este arquivo não pode ter `import`/`export` no nível superior: isso o transformaria num módulo,
 * e `declare module 'msw/node'` dentro de um módulo é tratado como "aumento" de um módulo já
 * existente (que falharia, pois `msw/node` não resolve) em vez de declarar um módulo ambiente novo.
 */
declare module 'msw/node' {
  type RequestHandler = import('msw').RequestHandler;

  export type SetupServerApi = {
    listen(options?: { readonly onUnhandledRequest?: 'error' | 'warn' | 'bypass' }): void;
    resetHandlers(...nextHandlers: readonly RequestHandler[]): void;
    use(...handlers: readonly RequestHandler[]): void;
    close(): void;
  };

  export function setupServer(...handlers: readonly RequestHandler[]): SetupServerApi;
}
