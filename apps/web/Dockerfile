# NOTE: build context for this Dockerfile MUST be the repo ROOT, not apps/web,
# because pnpm workspaces need the root package.json / pnpm-workspace.yaml / pnpm-lock.yaml
# to resolve the "workspace:*" dependency on @mafia/shared.
# See docker-compose.yml: build.context is "." with dockerfile: apps/web/Dockerfile
#
# NOTE: if pnpm-lock.yaml does not exist yet, run `pnpm install` once locally at the
# repo root to generate it before building this image.

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
WORKDIR /repo

COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY apps/web apps/web
COPY packages/shared packages/shared
COPY tsconfig.base.json ./tsconfig.base.json

RUN pnpm --filter @mafia/shared run build && pnpm --filter @mafia/web run build

# ---- runtime stage ----
FROM nginx:alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
