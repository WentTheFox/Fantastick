# Fantastick [![Build](https://github.com/WentTheFox/Fantastick/actions/workflows/node.yml/badge.svg)](https://github.com/WentTheFox/Fantastick/actions/workflows/node.yml) [![Crowdin](https://badges.crowdin.net/fantastick/localized.svg)](https://crowdin.com/project/fantastick) [![](https://top.gg/api/widget/servers/1478013755286880368.svg)](https://top.gg/bot/1478013755286880368)

Discord app written in Node.js (using [discord.js](https://www.npmjs.com/package/discord.js)) for managing and sending custom stickers.

## Self-Hosting

You can self-host your own instance of Fantastick either with Docker Compose (recommended) or directly on bare metal with pm2.

### Option A: Docker Compose (recommended)

Prerequisites: Docker Engine with the Compose plugin installed (`docker compose version`).

```
$ git clone https://github.com/WentTheFox/Fantastick.git
$ cd Fantastick
$ cp .env.example .env
$ nano .env # Fill in DISCORD_*, TELEGRAM_BOT_TOKEN, UPLOAD_*, and POSTGRES_* variables
$ docker compose build
$ docker compose up -d
```

This starts PostgreSQL, applies database migrations automatically, then starts the bot and its background queue worker.

> **Note:** `DATABASE_URL`/`SHADOW_DATABASE_URL` in `.env` are only used for bare-metal hosting. The Docker Compose setup builds its own internal database connection string from `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`, so you don't need to edit `DATABASE_URL` for the Docker path.

Prefer not to build locally? Every push to `main` publishes a new version of the app/queue-worker image to [GHCR](https://github.com/WentTheFox/Fantastick/pkgs/container/fantastick). You can pull that instead of building from source (the `migrate` service still needs a local build, since it must match your checked-out schema/migrations):
```
$ docker compose pull app queue-worker
$ docker compose build migrate
$ docker compose up -d
```

View logs:
```
$ docker compose logs -f app queue-worker
```

Stop the stack:
```
$ docker compose down
```
Only add `-v` if you intentionally want to wipe the database — Postgres data lives in a named Docker volume that persists across restarts and rebuilds. The same is true of sticker files, but only when `UPLOAD_API_ENABLED=false` (the default). Set it to `true` and sticker files live on the remote upload API instead of a local volume, unaffected by `-v`.

Update to a new version:
```
$ git pull
$ docker compose build
$ docker compose up -d
```

> **Note:** the `postgres` service uses the `postgres:latest` image, which can move to a new major PostgreSQL version on a routine rebuild. Postgres data directories are not compatible across major versions, so before running `docker compose build`/`docker compose up -d` after a while, it's worth checking what version `postgres:latest` currently resolves to versus what's already in your data volume.

### Option B: Bare metal (pm2)

Prerequisites: [ffmpeg](https://ffmpeg.org/download.html) and a Chromium/Chrome browser must be installed, since importing animated Telegram stickers converts them to GIF using ffmpeg and headless Chromium (the Docker Compose path installs both automatically, but bare-metal hosting needs them installed manually). For example, on Debian/Ubuntu:
```
$ sudo apt install ffmpeg chromium
```

```
$ sudo npm install -g pm2
$ pnpm install
$ cp .env.example .env
$ nano .env # Fill in the neccessary environment variables, including PUPPETEER_EXECUTABLE_PATH (e.g. /usr/bin/chromium)
$ pnpm exec prisma generate
$ pnpm run build
$ pnpm exec prisma migrate deploy
$ pm2 start pm2.json
```

## Development

For local development against a bot account you control, follow the bare
metal steps above through `pnpm exec prisma generate`, then run:

```
$ pnpm dev
```

This runs the bot directly from TypeScript source via `tsx`, skipping the
`tsc` build step. Set `DEV_WATCH=true` in `.env` to additionally hot-reload
command/component handler implementations as you edit them, without
restarting the process or re-registering slash commands with Discord — see
`@wentthefox-org/discord-bot-framework`'s `/dev` docs for how this works and
its limitations (e.g. changing a command's name/options/description still
needs a restart).

## Frequently Asked Questions

### 1) What is this sorcery?
I created Fantastick for myself, with the sole purpose of not wanting to pay for Discord Nitro (and potentially dozens of boosts) just to be able to use the over 100 stickers I personally use on Telegram.

The app uses slash commands to let you create your own sticker packs and add stickers to them by name, which you can then send to any text channel (if the server does not have the bot, permissions must allow the use of externals apps)

You can create a pack using the `/create-pack` command by specifying a globally unique name, whether the pack is NSFW, and whether it should be usable by anyone (public) or just you (private).

Once a pack is created, stickers can be added via `/create-sticker` from either an URL or a file upload. When using a URL it will be sent as the message to let Discord preview it, and when using a file upload the image will be attached to the reply posted by the app.

### 2) Why don't I have permission to use any of Fantastick's create commands?

This is by design, the app is brand new and I have no clue how I'm going to handle moderation of user-submitted content, so I am enlisting the help of a read-only mode for the general public for the time being. If you are an artist and want to be able to create sticker packs via the app, please reach out to me ([WentTheFox]) directly.

[WentTheFox]: https://went.tf

If you are self-hosting your own instance, you will need to grant yourself (and anyone else you trust) write access by setting the `readOnly` column to `false` for the specific user(s) in the `DiscordUsers` table.

### 3) What if I want to use the app without contacting you?
A project like this, that directly serves to undermine Discord's bottom line by making a monetised feature (stickers) more easily accessible, is basically a giant target waiting to be shot at. If the instance of the app that I'm running gets too popular it will likely be removed for any number of made-up reasons even if it doesn't specifically break anything currently in the Discord Terms of Service. I can almost guarantee it will not make it past the mandatory verification step that is require when the app reaches the 100-server threshold.

The only resilient option is to host your own instance of the project, either from your own machine or a dedicated server. If you self-host, you have full control over the database and can give anyone you trust write access on your own instance. To facilitate this, and to make the app easily auditable, the bot is completely open-source (MIT licensed), but since you are already looking at the repository, this should be self-evident. See the [Self-Hosting](#self-hosting) section above for setup instructions.

**Please note:** If you make your own app based on this codebase I would ask that you refrain from reusing the same name/assets that I use for my instance. The logo is intentionally left out of the project repository. I encourage  you to come up with your own name and icon for your instances, at the very least for when registering it within Discord's developer dashboard. I used [3dgifmaker.com] and [ezgif.com's reverser] to create the import loading animations for the emojis used by the app.

[3dgifmaker.com]: https://www.3dgifmaker.com/FidgetSpinner
[ezgif.com's reverser]: https://ezgif.com/reverse

Forking and modifying the code to fit your needs is highly encouraged. If you need assistance with setting up your own server, feel free to [join the Discord server] ask in ⁠the [#help-and-suggestions channel](https://discord.com/channels/1477776813777490223/1477777007680163860) for guidance. If there is sufficient demand, I will make a more in-depth guide. 

[join the Discord server]: https://discord.gg/6KMUDvPpVu
[#help-and-suggestions channel]: https://discord.com/channels/1477776813777490223/1477777007680163860

## Translation

New language contributions are not currently accepted.

English and Hungarian translations have been included, so no translators will be needed for these two languages.
