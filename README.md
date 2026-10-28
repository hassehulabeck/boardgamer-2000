# Boardgamer 2000

A PWA for our board game nights: starting-player picker, game log and stats.

Stack: SvelteKit (adapter-node), Postgres + Drizzle on Railway, installable as a PWA.
See `PLAN.md` for the roadmap and `CLAUDE.md` for conventions and deploy steps.

## Develop

```sh
npm install
cp .env.example .env   # local Postgres + group code
createdb boardgamer_dev && npm run db:migrate
npm run dev -- --host   # --host lets phones on the same Wi-Fi open it
```

Open `http://<your-computer's-ip>:5173/picker` on a phone to try the finger picker.

## Build

```sh
npm run check
npm run build
node build              # serves on PORT (default 3000)
```

The service worker (offline support) only runs on `localhost` or over HTTPS, so test
installing to the home screen on the deployed site.
