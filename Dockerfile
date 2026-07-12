# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS build
WORKDIR /app

# Match the packageManager field in package.json exactly
RUN corepack enable && corepack prepare pnpm@11.5.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Full install (not --ignore-scripts): the `prepare` script runs `ts-patch install`,
# which is required for the typia transform plugin declared in tsconfig.json to
# actually run during `tsc`. This mirrors setup/post-receive.sh (the real
# production deploy path), not node.yml's CI shortcut.
RUN pnpm install --frozen-lockfile

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm exec prisma generate

COPY src ./src
COPY utils ./utils
RUN pnpm run build

RUN pnpm prune --prod


FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/package.json ./package.json
# tsc does not copy JSON locale files into build/; i18next reads them from
# disk at runtime relative to process.cwd() (see src/constants/locales.ts).
COPY --chown=node:node src/locales ./src/locales

USER node

CMD ["node", "--enable-source-maps", "build/src/index.js"]
