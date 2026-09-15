# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.4.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/bff/package.json apps/bff/
# --ignore-scripts: sem husky/prepare dentro do container
RUN pnpm install --frozen-lockfile --ignore-scripts --filter bff...
COPY packages/contracts packages/contracts
COPY apps/bff apps/bff
RUN pnpm --filter bff build && pnpm --filter bff deploy --legacy --prod /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/bff/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
CMD ["node", "dist/server.mjs"]
