.PHONY: dev build

ZOLA_IMAGE := ghcr.io/getzola/zola:v0.22.1
PODMAN_RUN := podman run --rm -v "$(CURDIR)":/app:Z -w /app $(ZOLA_IMAGE)

# Local dev server, matches the exact zola version used in production.
dev:
	podman run --rm -v "$(CURDIR)":/app:Z -w /app -p 1111:1111 $(ZOLA_IMAGE) \
		serve --interface 0.0.0.0

# Production build.
build:
	$(PODMAN_RUN) build
