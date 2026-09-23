# WRO Denmark site — self-contained Node server with boot migrations.
#
# Coolify builds this image on the VPS (see docs/adr/0001-hetzner-vps-coolify.md).
# The container needs only DATABASE_URL and PORT: on start it applies the
# committed Drizzle migrations idempotently, then serves dist/client +
# dist/server from a single Node process (src/server/production-server.mjs).
#
# Pinned, released versions only: base image is a specific node release,
# dependencies come from the committed package-lock.json via `npm ci`.

FROM node:24.16.0-alpine3.22 AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

FROM node:24.16.0-alpine3.22 AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
# Prerendering needs no database: only static content pages are prerendered.
RUN npm run build

FROM node:24.16.0-alpine3.22
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src/server ./src/server
USER node
EXPOSE 3000
CMD ["node", "src/server/production-server.mjs"]
