+++
title = "kiero.dev"
description = "This site. Static, self-hosted, privacy-respecting."
weight = 1

[extra]
repo = "https://github.com/real-kiero/kiero.dev"
url = "https://kiero.dev"
+++

{% callout() %}
TL;DR: Solution design write up that covers the decision process and deployment of my static site built with Zola and Tailwind containerised with a four-stage Docker build, served by Caddy, and deployed automatically via Watchtower. Images are stored and optimised via Cloudflare R2. Hosted on Scaleway for renewable energy and right-sized cost. Analytics are self-hosted with Umami so visitor data never leaves the server.
{% end %}

This site is a personal portfolio and blog. I wanted it to be private, automatic, secure, and modern, and I made deliberate choices rather than just reaching for the obvious stack. What follows is a breakdown of those choices and the thinking behind each one.

## Architecture

The architecture was designed upfront rather than assembled on the fly. Everything deploys from GitHub through a CI/CD pipeline, and the diagram below reflects the full plan as it was drawn before any of it was built.

{{ figure(src="Infrastructure", alt="Architecture diagram showing the CI pipeline and runtime stack" caption="Architecture diagram showing the CI pipeline and runtime stack") }}

## Portfolio Layer

#### [Zola](https://www.getzola.org/)

Most static site generators come bundled with a Node or Ruby dependency tree, slow rebuild times, or a framework you end up fighting against. [Hugo](https://gohugo.io/) is fast, but its template language is notoriously opaque, and the theme ecosystem tends to push you towards importing someone else's opinions about your markup. Zola is a single Rust binary, with no runtime, sub-second rebuilds, and a [Tera](https://keats.github.io/tera/) templating engine that handles everything a blog needs without pulling in a plugin ecosystem. Tera's syntax is close enough to Django's that picking it up was straightforward, which made it an easy choice.

The templates were generated with [Claude](https://claude.ai/)'s assistance. I'd already built Zola templates by hand on a previous project, and I had no interest in doing that again for what was primarily a solutions design exercise. I reviewed all of the output, though some inconsistencies crept through, mostly a handful of raw CSS overrides where Tailwind classes should have been used instead, likely because Claude drew on Zola's conventional SCSS patterns rather than the Tailwind-first approach used here.

#### Tailwind CSS

The alternative to utility-first CSS is writing and maintaining a separate stylesheet, and for a site this small that means either wrestling with specificity or introducing a design system that quickly outgrows the problem. [Tailwind](https://tailwindcss.com/) keeps styling co-located with structure, drops the config file in favour of a single CSS entry point, and removes one more file that only exists to describe other files. The build output is a single minified stylesheet, generated at build time, with nothing loaded at runtime.

## Deployment

#### Docker Build

My previous deployment used GitHub Actions runners to spin up an ephemeral Linux server, install Zola, build the site, and push the files to an [nginx](https://nginx.org/) server over SSH. It worked, but the VPS was a live server I had to actively manage and keep in a known state. Any configuration drift, failed push, or expired credential meant manual intervention.

The current approach containerises the whole stack. A single-stage build would ship Node, the Zola binary, and compression tooling into the final image alongside the web server, which increases image size and widens the attack surface. Instead, the image runs through four stages, each with a single responsibility:

1. **Node** - compiles Tailwind CSS and outputs `main.css`
2. **Zola** - builds the static site into `public/`
3. **Alpine Linux** - pre-compresses every eligible asset with Brotli, gzip, and Zstandard
4. **Caddy** - the final image contains only the compressed files and the web server

Pre-compressing at build time means Caddy serves straight from disk rather than compressing per request, and the final image carries no build tooling. The net result is that I rarely need to touch the VPS directly, while still having full access and control when I want it.

The VPS itself is hardened with standard security practices, a dedicated non-root user running the containers, root SSH disabled, [Fail2ban](https://www.fail2ban.org/) configured, and automatic security updates enabled.

#### Watchtower

[Watchtower](https://containrrr.dev/watchtower/) is a direct extension of the automatic update goal. Every 24 hours it polls the container registry, pulls any updated images, and restarts the affected containers. CI pushes a new image to GHCR on every commit to `main`, and Watchtower closes the loop on the server side, with no deployment scripts, no SSH access from CI, and no manual steps. The PostgreSQL container is excluded to prevent unintended major-version upgrades.

#### Lychee

Static sites accumulate dead links quietly. An external resource moves, a domain lapses, and the content rots without anything surfacing it. [Lychee](https://lychee.cli.rs/) is a Rust-based link checker that runs as a CI step on every commit to `main`, crawling all internal and external links in the built output and failing the pipeline if any are broken. It's fast enough to check the full site in seconds, and it covers renamed anchors, removed pages, and expired third-party URLs alike.

## Hosting

#### Scaleway

AWS was the first provider I considered, given how closely I work with it day to day. The console is familiar and the service catalogue comfortably covers everything this site needs. But AWS is built for distributed workloads at scale, and the operational and financial overhead is disproportionate for a static site and a small analytics database.

[Scaleway](https://www.scaleway.com/) stood out on two points. Their data centres run on renewable energy, and they publish a carbon footprint significantly lower than the major hyperscalers. Their dashboard also exposes per-service resource consumption in a layout that's visually close to the AWS console, which made the transition straightforward. The familiar interface and the carbon footprint were the deciding factors.

A DEV1-S instance was chosen to comfortably run Caddy, Umami, and PostgreSQL simultaneously, with dedicated CPU and enough RAM that none of the three are competing for headroom.

#### [Caddy](https://caddyserver.com/)

My previous site ran on nginx, configured manually with [certbot](https://certbot.eff.org/) handling HTTPS. It works, and I have direct experience running it, but it increasingly feels dated. HTTPS is a baseline expectation at this point, and nginx still doesn't handle TLS for you out of the box. Certbot was serviceable, but it was an additional maintenance concern for something that should just be automatic.

Caddy handles TLS via [Let's Encrypt](https://letsencrypt.org/) with no extra tooling or renewal management, and that was the main reason for switching. Its configuration is also readable without consulting a manual — the [Caddyfile](https://github.com/real-kiero/kiero.dev/blob/main/Caddyfile) for this site is 30 lines. It serves pre-compressed static files, sets year-long cache headers for assets, and proxies `analytics.kiero.dev` to Umami. I have less operational history with Caddy than nginx, but nothing about running it has given me reason to reconsider.

#### Cloudflare R2

Serving images directly from the VPS means every request hits the origin, adding latency for visitors further from the server and putting unnecessary load on a machine that is otherwise only serving pre-compressed static files. R2 moves image storage off the VPS entirely and onto Cloudflare's edge network, so images are delivered from a location close to the visitor with no egress fees. Cloudflare's image optimisation pipeline handles format conversion at the CDN layer, serving WebP where the browser supports it and falling back to JPEG otherwise, with no build-time processing or extra tooling on the server required.

## Analytics

#### Umami

Privacy runs through the design of this site, which is why [Umami](https://umami.is/) is self-hosted rather than running in the cloud. It's cookieless and GDPR-compliant by default, and visitor data never leaves the server. Routing analytics through a managed service hands that data to a third party, and that cuts against the point.

## Privacy

The same thinking influenced every vendor decision. Providers that required government ID were excluded outright, because trusting that level of sensitive data with a third party is a risk I'm not willing to accept, particularly given recent reporting on AI systems discovering and weaponising zero-day vulnerabilities at scale.

{% callout() %}
The simplest protection against a data breach is making sure the data doesn't exist to be taken. These are minor mitigations, but they were all deliberate.
{% end %}

Payment exposure was factored in too, with virtual cards that can be frozen immediately used where possible, and PayPal providing an additional layer of separation for payment processing.


