# NOTE: build context for this Dockerfile MUST be the repo ROOT, not apps/server,
# because pnpm workspaces need the root package.json / pnpm-workspace.yaml / pnpm-lock.yaml
# to resolve the "workspace:*" dependencies on @mafia/shared and @mafia/content.
# See docker-compose.yml: build.context is "." with dockerfile: apps/server/Dockerfile
#
# NOTE: if pnpm-lock.yaml does not exist yet, run `pnpm install` once locally at the
# repo root to generate it before building this image (the build below uses
# --frozen-lockfile, which requires a lockfile to be present and up to date).

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
WORKDIR /repo

# ---- deps + build stage ----
FROM base AS build
# Copy just enough of the workspace manifests first for better layer caching.
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/content/package.json packages/content/package.json

RUN pnpm install --frozen-lockfile

# Now copy the actual source and build the server + its workspace deps.
COPY apps/server apps/server
COPY packages/shared packages/shared
COPY packages/content packages/content
COPY tsconfig.base.json ./tsconfig.base.json

RUN pnpm --filter @mafia/server... run build

# ---- runtime stage ----
FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
WORKDIR /repo

# Keep it simple: copy the whole built workspace (node_modules included) from the
# build stage rather than fighting with `pnpm deploy`. This is not the smallest
# possible image, but it is correct and easy to reason about for a hobby deployment.
COPY --from=build /repo /repo

WORKDIR /repo/apps/server
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
