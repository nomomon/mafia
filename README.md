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

Then open `http://localhost:8080` (or whatever `PORT_WEB` you set in `.env`).

## Local development

```
pnpm install
pnpm dev:server   # in one terminal
pnpm dev:web      # in another terminal
```

## How to play

1. The host opens the app on a laptop or tablet and creates a room.
2. The host shares the room code with everyone else, who join on their own phones.
3. The host configures the game (number of mafia, whether a doctor and sheriff are in play) and starts the round.
4. Night actions and voting happen privately on each player's device, while the group talks things out loud in person.
5. Each round, the narrator posts a short, funny story recapping what happened, before moving on to the next round.

## Known limitation

All game state is kept in memory in the server process. If the server container restarts (deploy, crash, host reboot), every active room and its state is lost. There is no database or persistence in v1.
