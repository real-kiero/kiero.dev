# syntax=docker/dockerfile:1

# Stage 1: build site 
FROM ghcr.io/getzola/zola:v0.22.1 AS zola
WORKDIR /site
COPY . .
RUN ["zola", "build"]

# Stage 2: pre-compress 
FROM alpine:3.19 AS compressor
WORKDIR /site
COPY --from=zola /site/public public
RUN apk add --no-cache brotli gzip zstd
RUN find ./public -type f -size +1400c \
    -regex ".*\.\(css\|html\|js\|json\|svg\|xml\)$" \
    -exec brotli --best {} \+ \
    -exec gzip --best -k {} \+ \
    -exec zstd --ultra -k {} \+

# Stage 3: serve
FROM caddy:2-alpine
COPY --from=compressor /site/public /srv
COPY Caddyfile /etc/caddy/Caddyfile
