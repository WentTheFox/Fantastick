# Commit messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow:

```
<type>[optional scope]: <description>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`.

This is enforced by commitlint (`commitlint.config.js`, husky `commit-msg` hook, and the `Commitlint` CI workflow on pull requests) and is not optional — do not bypass it with `--no-verify`.

It matters beyond style: the commit subject should start lower-case (commitlint `subject-case`). There are no version tags: `.github/workflows/images.yml` publishes a multi-arch image on every push to `main`.

# Running in the Kubernetes cluster

- Image: `ghcr.io/wentthefox/fantastick`, tags `<sha7>` and `sha-<sha7>` (amd64 + arm64, built natively). One image, `target: runtime`, runs as the non-root `node` user.
- Default `INTERACTIONS_MODE=webhook`: App runs an HTTP Interactions Endpoint (`src/utils/webhook-server.ts`, node:http) on `WEBHOOK_HOST:WEBHOOK_PORT` (use `WEBHOOK_HOST=0.0.0.0`, port 3000) and opens **no gateway connection and no shard manager**. It answers only `POST /<WEBHOOK_PATH_SECRET>` (Ed25519-verified with `DISCORD_PUBLIC_KEY`); GET `/` redirects to `LANDING_PAGE` (when set); everything else is a bare 404, so there is no health route (use a TCP probe on 3000). It must be publicly reachable (fantastick-prod.went.tf -> Service :3000; the secret path is the gate).
- `INTERACTIONS_MODE=gateway` is the legacy sharded gateway mode (no port; must never run twice).
- Two Deployments from the same image, one replica each, Recreate:
  - App: `node --enable-source-maps build/src/index.js` (default CMD)
  - QueueWorker: `node --enable-source-maps build/src/queue-worker.js` (no port)
- Migrations are a separate one-off step (Argo PreSync Job), not part of app start: `node_modules/.bin/prisma migrate deploy` (no pnpm in the image; needs `DATABASE_URL`; `prisma` CLI is a runtime dependency, `prisma/` and `prisma.config.ts` are in the image).
- Env var names (values in a Secret): `INTERACTIONS_MODE`, `DISCORD_PUBLIC_KEY`, `WEBHOOK_PATH_SECRET`, `WEBHOOK_HOST`, `WEBHOOK_PORT`, `WEBHOOK_VERBOSE_DIAGNOSTICS`, `LANDING_PAGE` (optional), `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `UA_STRING`, `DISCORD_INVITE_URL`, `DISCORD_FEED_WEBHOOK_URL` (optional), `DISCORD_LOG_WEBHOOK_URL` (optional), `LOCAL`, `DEBUG_I18N`, `DISABLE_SETTINGS`, `UPLOAD_API_ENABLED`, `UPLOAD_API_POST_URL`, `UPLOAD_API_RESPONSE_FIELD`, `UPLOAD_API_FILE_FIELD`, `UPLOAD_API_DELETE_URL_FIELD`, `DEV_WATCH` (false). `SHADOW_DATABASE_URL` is dev-only and not needed. `PUPPETEER_EXECUTABLE_PATH` is preset in the image.
- Volume: `/app/fs` (sticker files when `UPLOAD_API_ENABLED=false`) must be shared by App and QueueWorker (ReadWriteMany, or both pods on one node), writable by uid 1000.
- External services: Postgres database `fantastick`; optional OpenSearch (`OPENSEARCH_URL`, `OPENSEARCH_INDEX` default `fantastick-stickers`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`; unset URL = Postgres search fallback; empty/unset `OPENSEARCH_USERNAME` means no auth header is sent (`opensearch-client.ts`), so credentials are optional (cluster: `OPENSEARCH_URL=http://opensearch.opensearch.svc:9200`, no credentials); the index is rebuilt by the `ReconcileStickerSearchIndex` queue job); no Valkey or mail; outbound Discord and Telegram APIs.
- Deploy: `.github/workflows/deploy.yml` (manual) asks Argo CD to sync `fantastick-prod`.
