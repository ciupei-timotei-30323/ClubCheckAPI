# syntax=docker/dockerfile:1
#
# Build:
#   docker build \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://events.example.com \
#     -t clubcheck-frontend .
#
# Run:
#   docker run --rm -p 3000:3000 \
#     -e MAIN_API_BASE_URL=https://clubcheck-api.example.com \
#     clubcheck-frontend

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies separately so Docker can cache this layer.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM base AS builder

# NEXT_PUBLIC_* values are inlined at build time.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# MAIN_API_BASE_URL is server-side and must be supplied at runtime.
CMD ["node", "server.js"]
