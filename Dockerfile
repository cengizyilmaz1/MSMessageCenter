# syntax=docker/dockerfile:1

# =============================================================================
# Microsoft 365 Message Center Archive — production image for any Docker host
# (Coolify, Dokku, Render, Fly, a plain VPS, ...). See DEPLOYMENT.md.
#
# The app is a Next.js *static export* (next.config.mjs -> output: "export").
# There is no Node runtime at serve time: the build stage produces /app/out and
# the runtime stage is a tiny nginx image that serves those static files.
# =============================================================================

# ---- Build stage -----------------------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Canonical site URL baked into rss.xml, sitemap.xml, messages-index.json, etc.
# Override in Coolify (Build Variables / Build Args) if you serve a new domain.
ARG SITE_URL=https://message.cengizyilmaz.net
ENV SITE_URL=${SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1
# NOTE: do NOT set NODE_ENV=production here — it makes `npm ci` skip
# devDependencies, but the build needs them (tailwindcss, @tailwindcss/postcss,
# typescript, postcss). `next build` produces a production build regardless.

# Install ALL dependencies against the lockfile (--include=dev guards against a
# production npm config dropping devDependencies). Manifests first so this layer
# caches across source-only edits.
COPY package.json package-lock.json ./
# Persist npm's package cache across builds (BuildKit cache mount) so repeated
# deploys don't re-download tarballs.
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

# Copy the rest of the source and build the static site.
# `npm run build` runs the `prebuild` hook first:
#   scripts/build-public-feeds.mjs  -> public/history/*, message-paths.json,
#                                       messages-index.json, rss.xml
#   scripts/build-references.mjs    -> augments messages-index.json
# then `next build` writes the static export to /app/out.
COPY . .
# Persist Next.js's build cache across deploys (BuildKit cache mount) so the
# compile phase is incremental on repeat builds. The exported /app/out is still
# produced fresh; only .next/cache is reused.
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ---- Runtime stage ---------------------------------------------------------
# nginx:1.29-alpine tracks the latest patch of the 1.29 line + current Alpine
# base, so a rebuild pulls security fixes. Re-scan / bump the minor periodically.
FROM nginx:1.29-alpine AS runtime

# Only the static output and the nginx config end up in the served image.
COPY --from=build /app/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Coolify/Traefik can also health-check via HTTP; this keeps Docker itself aware.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/robots.txt >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
