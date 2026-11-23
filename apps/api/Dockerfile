# The API image (ADR 0079). Build it from the repository root:
#   docker build -f apps/api/Dockerfile -t daily-quiz-api .
# It starts as the API by default, or runs the migrations: `docker run daily-quiz-api migrate`.

# Build stages run pnpm on an official Node image. That image's Node is never shipped: the
# runtime gets the exact Node that pnpm provisions from pnpm-lock.yaml, so the version stays
# written once, in package.json (`devEngines.runtime`, ADR 0001).
# node:26-trixie-slim, digest checked 2026-11-23
FROM node:26-trixie-slim@sha256:e6bedef217677b276c591795e169840edd9096dbf13f29df8ef8d1856b8820bc AS pnpm
WORKDIR /repo
COPY package.json ./
# pnpm at the version `packageManager` pins.
RUN npm install --global --no-fund --no-audit \
      "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")"

# The workspace's Node: pnpm downloads it from the URL in the lockfile and checks the sha256
# recorded there, even when this image's own Node has the same version.
FROM pnpm AS node
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json packages/config/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter . \
 && install -D -m 0755 "$(pnpm exec node -p process.execPath)" /opt/node/bin/node

# Production dependencies of @repo/api and of the workspace packages it imports. The install
# keeps pnpm's workspace layout: apps/api/node_modules/@repo/* are symlinks into packages/,
# outside any node_modules, which is the only place Node strips types. Never use `pnpm deploy`,
# `injectWorkspacePackages` or `--preserve-symlinks` for this image (ADR 0079): the smoke
# script's time-zone check imports @repo/game-rules inside the image to catch it.
FROM pnpm AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --prod
COPY packages packages
COPY apps/api apps/api
RUN pnpm install --offline --frozen-lockfile --ignore-scripts --prod --filter-prod "@repo/api..."

# debian:trixie-slim, digest checked 2026-11-23
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2 AS runtime
# Node 26's official binary links libatomic, which the slim image lacks.
RUN apt-get update \
 && apt-get install --yes --no-install-recommends libatomic1 \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 10001 api \
 && useradd --system --uid 10001 --gid api --no-create-home --home-dir /nonexistent \
      --shell /usr/sbin/nologin api
COPY --from=node /opt/node/bin/node /usr/local/bin/node
WORKDIR /app
# Owned by root and read-only to the api user: the process can't change its own code.
COPY --from=deps /repo/node_modules node_modules
COPY --from=deps /repo/packages packages
COPY --from=deps /repo/apps/api apps/api
ENV NODE_ENV=production PORT=3000
USER 10001:10001
EXPOSE 3000
# Node is PID 1 and handles SIGTERM and SIGINT itself; no shell or package manager in between.
ENTRYPOINT ["node", "apps/api/src/main.ts"]
CMD ["api"]
# Last, so a new commit rebuilds no layer above it. `/health` reports it.
ARG GIT_COMMIT=""
ENV GIT_COMMIT=${GIT_COMMIT}
