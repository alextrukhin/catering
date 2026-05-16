FROM node:26-alpine3.22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN npm install -g pnpm@11.0.9 \
    && pnpm config set store-dir /pnpm-store --global

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/prisma/package.json ./packages/prisma/
COPY packages/website/package.json ./packages/website/
COPY packages/cron/package.json ./packages/cron/
RUN --mount=type=cache,id=pnpm,target=/pnpm-store pnpm install --frozen-lockfile

FROM deps AS prisma-build
COPY ./ /app/
WORKDIR /app/packages/prisma
RUN pnpm generate

FROM prisma-build AS build-website
WORKDIR /app/packages/website
ARG APP_VERSION="dev"
ENV APP_VERSION=$APP_VERSION
ENV NODE_OPTIONS='--max_old_space_size=10048'
RUN pnpm build

FROM prisma-build AS build-cron
WORKDIR /app/packages/cron
RUN pnpm build
WORKDIR /app
RUN pnpm --filter catering-cron deploy --prod /cron-prod --legacy \
    && cp -r /app/packages/cron/dist /cron-prod/dist

FROM node:26-alpine3.22 AS website
WORKDIR /app/packages/website
COPY --from=build-website --chown=node:node /app/packages/website/.output/ /app/packages/website/.output/
COPY --from=prisma-build --chown=node:node /app/packages/prisma /app/packages/prisma
COPY --from=prisma-build --chown=node:node /app/deployment/run.sh /app/deployment/run.sh
WORKDIR /app
CMD ["sh", "deployment/run.sh"]

FROM node:26-alpine3.22 AS cron
COPY --from=build-cron --chown=node:node /cron-prod /app
WORKDIR /app
CMD ["node", "dist/index.mjs"]