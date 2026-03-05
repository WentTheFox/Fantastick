# Fantastick [![Build](https://github.com/WentTheFox/Fantastick/actions/workflows/node.yml/badge.svg)](https://github.com/WentTheFox/Fantastick/actions/workflows/node.yml) [![Crowdin](https://badges.crowdin.net/fantastick/localized.svg)](https://crowdin.com/project/fantastick) [![](https://top.gg/api/widget/servers/1478013755286880368.svg)](https://top.gg/bot/1478013755286880368)

Discord app written in Node.js (using [discord.js](https://www.npmjs.com/package/discord.js)) for managing and sending custom stickers.

```
$ sudo npm install -g pm2
$ npm install
$ cp .env.example .env
$ nano .env # Fill in the neccessary environment variables
$ npx prisma generate
$ npm build
$ npx prisma migrate deploy
$ pm2 start pm2.json
```

## Frequently Asked Questions

### 1) What is this sorcery?
I created Fantastick for myself, with the sole purpose of not wanting to pay for Discord Nitro (and potentially dozens of boosts) just to be able to use the over 100 stickers I personally use on Telegram.

The app uses slash commands to let you create your own sticker packs and add stickers to them by name, which you can then send to any text channel (if the server does not have the bot, permissions must allow the use of externals apps)

You can create a pack using the `/create-pack` command by specifying a globally unique name, whether the pack is NSFW, and whether it should be usable by anyone (public) or just you (private).

Once a pack is created, stickers can be added via `/create-sticker` from either an URL or a file upload. When using a URL it will be sent as the message to let Discord preview it, and when using a file upload the image will be attached to the reply posted by the app.

### 2) Why don't I have permission to use any of Fantastick's create commands?

This is by design, the app is brand new and I have no clue how I'm going to handle moderation of user-submitted content, so I am enlisting the help of a read-only mode for the general public for the time being. If you are an artist and want to be able to create sticker packs via the app, please reach out to me (@WentTheFox) directly.

If you are self-hosting your own instance, you will need to grant yourself (and anyone else you trust) write access by setting the `readOnly` column to `false` for the specific user(s) in the `DiscordUsers` table.

### 3) What if I want to use the app without contacting you?
A project like this, that directly serves to undermine Discord's bottom line by making a monetised feature (stickers) more easily accessible, is basically a giant target waiting to be shot at. If the instance of the app that I'm running gets too popular it will likely be removed for any number of made-up reasons even if it doesn't specifically break anything currently in the Discord Terms of Service. I can almost guarantee it will not make it past the mandatory verification step that is require when the app reaches the 100-server threshold.

The only resilient option is to host your own instance of the project, either from your own machine or a dedicated server. If you self-host, you have full control over the database and can give anyone you trust write access on your own instance. To facilitate this, and to make the app easily auditable, the bot is completely open-source (MIT licensed), but since you are already looking at the repository, this should be self-evident.

**Please note:** If you make your own app based on this codebase I would ask that you refrain from reusing the same name/assets that I use for my instance. The logo is intentionally left out of the project repository. I encourage  you to come up with your own name and icon for your instances, at the very least for when registering it within Discord's developer dashboard. I used [3dgifmaker.com/FidgetSpinner](https://www.3dgifmaker.com/FidgetSpinner) and [ezgif.com/reverse](https://ezgif.com/reverse) to create the import loading animations for the emojis.

Forking and modifying the code to fit your needs is highly encouraged. If you need assistance with setting up your own server, feel free to [join the Discord server] ask in ⁠help-and-suggestions for guidance. If there is sufficient demand, I will make a more in-depth guide. 

[join the Discord server]: https://discord.gg/6KMUDvPpVu

## Translation

New language contributions are not currently accepted.

English and Hungarian translations have been included, so no translators will be needed for these two languages.
