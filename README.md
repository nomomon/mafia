# Mafia

A self-hosted, browser-based Mafia (Werewolf) party game: one screen hosts the room, everyone else joins from their phone.

## Prerequisites

- Docker and Docker Compose (recommended, for running the whole app)
- Or, for local development: Node.js 22+ and pnpm

## Quick start

```
cp .env.example .env
docker compose up --build
```

Then open `http://localhost:8080` (or whatever `PORT_WEB` you set in `.env`). The host port mapping comes from `docker-compose.override.yml`, which plain `docker compose up` merges in automatically.

## Deploying behind a reverse-proxy platform (Dokploy, Coolify, etc.)

`docker-compose.yml` itself does **not** bind a host port for the `web` service — only `expose: "80"`. Platforms like Dokploy run their own reverse proxy (Traefik) and expect to pick which container port to route a domain to from their own dashboard; a hardcoded `ports:` mapping in the compose file fights that and can fail on redeploy with `port is already allocated`. When deploying with one of these, just point the platform's domain/port configuration at the `web` service's container port `80` — don't add a `ports:` mapping back.

## Local development

```
pnpm install
pnpm dev:server   # in one terminal
pnpm dev:web      # in another terminal
```

## How to play

There's no host with special powers — the app itself referees the game. Whoever creates the room gets a room code to share, but from then on every player has equal say.

1. One player opens the app and creates a room; everyone else joins from their own phones using the room code.
2. Anyone can adjust the game settings (number of mafia, whether a doctor and sheriff are in play) while in the lobby. The game starts automatically once a majority of players mark themselves ready.
3. Night actions and voting happen privately on each player's device, while the group talks things out loud in person.
4. Moving on from one phase to the next (starting a vote, skipping a stuck night, continuing past the morning news) also just needs a majority of players ready — no one has to wait on a single person to click a button.
5. Each round, the narrator posts a short, funny story recapping what happened, before moving on to the next round.

## Known limitation

All game state is kept in memory in the server process. If the server container restarts (deploy, crash, host reboot), every active room and its state is lost. There is no database or persistence in v1.
