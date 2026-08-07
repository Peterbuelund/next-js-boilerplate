# Production image for the Next.js standalone output.
# Build: docker build --build-arg NEXT_PUBLIC_APP_URL=https://example.com -t app .
# Run:   docker run -p 3000:3000 --env-file .env app
# Full contract: README.md, "Building and running the container image".

FROM node:22.22-alpine AS base
# libc6-compat: Next's SWC binaries are built against glibc, not musl.
RUN apk add --no-cache libc6-compat && corepack enable
WORKDIR /app

FROM base AS deps
# pnpm-workspace.yaml carries `allowBuilds`, so pnpm needs it here too.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `src/lib/env.ts` validates at module load and `next build` evaluates it, so the
# build needs these. Not NEXT_PUBLIC_*, so not baked in — supply real ones at runtime.
ARG POSTGRES_URL="postgresql://build:build@localhost:5432/build"
ARG BETTER_AUTH_SECRET="build-time-placeholder-secret-not-used-at-runtime"
# NEXT_PUBLIC_* is inlined into the client bundle here and is NOT overridable at
# runtime. Build with the real origin or browsers get sent to localhost.
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV POSTGRES_URL=$POSTGRES_URL \
    BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# standalone omits these (it assumes a CDN); without them there are no JS chunks.
# `public/` doesn't exist yet and a COPY of a missing path fails the build.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
