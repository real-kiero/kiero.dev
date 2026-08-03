# kiero.dev

My personal website, intended to be hosted at [kiero.dev](https://kiero.dev).

A portfolio and blog built to be fast, minimal, and fully self-hosted. [Zola](https://www.getzola.org/) generates the HTML and [Caddy](https://caddyserver.com/) serves it all with pre-compressed static files. Analytics runs through a self-hosted [Umami](https://umami.is/) instance with no third-party tracking and no cookies.

The Docker image is a three-stage build that produces nothing but compressed assets and a web server. Deploys are handled by [Watchtower](https://containrrr.dev/watchtower/), which polls the registry daily and restarts updated containers automatically. No SSH required in CI.

## Running locally

Requires [Zola](https://www.getzola.org/documentation/getting-started/installation/).

```sh
make dev
```

## Why would you want to run this?

You probably don't. It's a personal site. Fork it if something's useful, but don't expect it to make sense outside of my setup.
