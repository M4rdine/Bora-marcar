// Root config so `eslint --fix` invoked by lint-staged (which runs from the
// repo root against staged files across all workspaces) always finds a
// config file. Each workspace owns and enforces its real ESLint rules
// (see apps/mobile/eslint.config.js, run via `pnpm lint`); this root config
// intentionally lints nothing on its own.
module.exports = [{ ignores: ['**/*'] }];
