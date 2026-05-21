# kiero.dev

My personal website, intended to be hosted at [kiero.dev](https://kiero.dev).

A portfolio and blog built to be fast, minimal, and fully self-hosted. [Zola](https://www.getzola.org/) generates the HTML, [Tailwind CSS v4](https://tailwindcss.com/) handles styling, and [Caddy](https://caddyserver.com/) serves it all with pre-compressed static files. Analytics runs through a self-hosted [Umami](https://umami.is/) instance with no third-party tracking and no cookies.

The Docker image is a four-stage build that produces nothing but compressed assets and a web server. Deploys are handled by [Watchtower](https://containrrr.dev/watchtower/), which polls the registry daily and restarts updated containers automatically. No SSH required in CI.

Full solution design write up [here](https://kiero.dev/projects/kiero-dev/).

## Running locally

Requires [Zola](https://www.getzola.org/documentation/getting-started/installation/) and Node.

```sh
npm install
make dev
```

## Why would you want to run this?

You probably don't. It's a personal site. Fork it if something's useful, but don't expect it to make sense outside of my setup.
