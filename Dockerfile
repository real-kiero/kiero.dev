# syntax=docker/dockerfile:1

# ── Stage 1: build CSS ────────────────────────────────────────────────────────
FROM node:22-alpine AS css
WORKDIR /build
RUN npm install -g @tailwindcss/cli
COPY input.css .
COPY templates ./templates
COPY static ./static
RUN tailwindcss -i input.css -o static/css/main.css --minify

# ── Stage 2: build site ───────────────────────────────────────────────────────
FROM ghcr.io/getzola/zola:v0.20.0 AS zola
WORKDIR /site
COPY . .
COPY --from=css /build/static/css/main.css static/css/main.css
RUN zola build

# ── Stage 3: pre-compress ────────────────────────────────────────────────────
FROM alpine:3.19 AS compressor
WORKDIR /site
COPY --from=zola /site/public public
RUN apk add --no-cache brotli gzip zstd
RUN find ./public -type f -size +1400c \
    -regex ".*\.\(css\|html\|js\|json\|svg\|xml\)$" \
    -exec brotli --best {} \+ \
    -exec gzip --best -k {} \+ \
    -exec zstd --ultra -k {} \+

# ── Stage 4: serve ───────────────────────────────────────────────────────────
FROM caddy:2-alpine
COPY --from=compressor /site/public /srv
COPY Caddyfile /etc/caddy/Caddyfile
