# syntax=docker/dockerfile:1

# Oprix — production image (Coolify / Hostinger KVM).
# Debian + full node_modules (not "standalone") for Prisma reliability: the query
# engine just works, and `prisma db push` + the one-time seed can run inside the
# container for first setup. `next start` serves the production build.

FROM node:22-slim AS base
WORKDIR /app
# OpenSSL is required by Prisma's query engine on Debian.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# ---- build ----
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder URLs so `prisma generate` and `next build` never need the real DB
# (Prisma connects lazily; no page queries run at build time). Real values are
# injected by Coolify at runtime.
ENV DATABASE_URL="postgresql://u:p@localhost:5432/db"
ENV DIRECT_URL="postgresql://u:p@localhost:5432/db"
ENV AUTH_SECRET="build-placeholder"
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
# Attachments / avatars / logos are written here. Mount a Coolify persistent
# volume at /app/uploads so they survive every redeploy.
RUN mkdir -p /app/uploads
EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
