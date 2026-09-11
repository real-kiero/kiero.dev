+++
title = "How I designed and built kiero.dev"
description = "A case study documenting the technical and architecture decisions behind this site."
date = 2026-08-06
+++

## Architecture

The architecture was designed upfront rather than assembled on the fly. Everything deploys from GitHub through a CI/CD pipeline, and the diagram below reflects the overall pipeline that runs this site.

{{ inline_svg(src="content/infrastructure.svg", caption="Architecture diagram showing the CI pipeline and runtime stack", breakout=true) }}

## Portfolio Layer

#### Zola

Most static site generators come bundled with a Node or Ruby dependency tree, slow rebuild times, or a framework you end up having to fight against. Previous iterations of this my site used [Hugo](https://gohugo.io/) which is fast, but its template language is notoriously opaque, and the theme ecosystem tends to push you towards importing someone else's opinions about your markup. 

[Zola](https://www.getzola.org/) is a single Rust binary, with no runtime, sub-second rebuilds, and additionally it uses the [Tera](https://keats.github.io/tera/) templating engine which handles everything a blog needs without pulling in a plugin ecosystem. As a Python dev, Tera's syntax is close enough to Django's was familiar and picking it up was straightforward.

## Deployment

#### Docker Build

My previous deployment used GitHub Actions runners to spin up an ephemeral Linux server, install Zola, build the site, and push the files to an [nginx](https://nginx.org/) server over SSH. It worked great, and I actually got the idea from the [Wolfgang's Channel](https://www.youtube.com/watch?v=ATenAnk8eX4). So why change? Well, within my work, I've recently been supporting a security sweep of our all of our repos and I've been trying to think on where I can apply these design principles in not only my own work going forward but also my personal projects. So, using the 'least privilege' principles, did my repository really need my VPS credentials? I didn't think so... 

My new approach containerises the whole stack but with some caveats. The problem with a single-stage build is, it would ship the Zola binary and compression tooling into the final image alongside the web server. Which in turn, increases image size and widens the attack surface. Instead, the image runs through three stages, each with a single responsibility:

1. **Zola** - builds the static site into `public/`
2. **Alpine Linux** - pre-compresses every eligible asset with Brotli, gzip, and Zstandard
3. **Caddy** - the final image contains only the compressed files and the web server

Pre-compressing at build time means Caddy serves straight from disk rather than compressing per request, and the final image carries no build tooling. The net result is that I rarely need to touch the VPS directly, while still having full access and control when I want it.

For the VPS itself, it's hardened with standard security practices e.g. a dedicated non-root user running the containers, root SSH disabled, [Fail2ban](https://www.fail2ban.org/) configured, and automatic security updates enabled.

#### Watchtower

[Watchtower](https://containrrr.dev/watchtower/) is a direct extension of the automatic update goal. Every 24 hours it polls the container registry, pulls any updated images, and restarts the affected containers. So when the CI pushes a new image to GHCR on every commit to `main`, Watchtower closes the loop on the server side, with no deployment scripts, no SSH access from CI, and no manual steps. The only exception to this being the PostgreSQL container which is excluded to prevent unintended major-version upgrades.

#### Lychee

Static sites accumulate dead links quietly. An external resource moves, a domain lapses, and the content rots without anything surfacing it. [Lychee](https://lychee.cli.rs/) is a Rust-based link checker that runs as a CI step on every commit to `main`, crawling all internal and external links in the built output and failing the pipeline if any are broken. It's fast enough to check the full site in seconds, and it covers renamed anchors, removed pages, and expired third-party URLs alike. 

Whilst it's a nice tool, if you plan on implementing the same or a similar service into your own CI/CD pipelines, be mindful that it can halt your deployments, requiring some tedious configuration to exclude certain sites that block non-human requests. It's great for small portfolios like mine though.  

## Hosting

#### Scaleway

Choosing a provider was my biggest consideration. AWS was the first provider I considered, given how closely I work with it day to day. The console is familiar and the service catalogue comfortably covers everything this site needs. But AWS is built for distributed workloads at scale, and the operational and financial overhead is disproportionate for a static site and a small analytics database

[Scaleway](https://www.scaleway.com/) stood out on two points. Their data centres run on renewable energy, and they publish a carbon footprint significantly lower than the major hyperscalers. Their dashboard is also visually close to the AWS console, which made the transition straightforward. The familiar interface and the carbon footprint were the deciding factors.

A DEV1-S instance was chosen to comfortably run Caddy, Umami, and PostgreSQL simultaneously, with a dedicated CPU and enough RAM that none of the three are competing for headroom.

#### [Caddy](https://caddyserver.com/)

My previous site ran on nginx, configured manually with [certbot](https://certbot.eff.org/) handling HTTPS. It worked, and I have direct experience running it, but it increasingly feels dated. HTTPS is a baseline expectation at this point, and nginx still doesn't natively handle TLS for you out of the box. Certbot was serviceable, but it was an additional maintenance concern for something that should just be automatic.

Caddy handles TLS via [Let's Encrypt](https://letsencrypt.org/) with no extra tooling or renewal management, and that was the main reason for switching. Its configuration is also readable without consulting a manual, the [Caddyfile](https://github.com/real-kiero/kiero.dev/blob/main/Caddyfile) for this site is only 30 lines. It serves pre-compressed static files, sets year-long cache headers for assets, and proxies `analytics.kiero.dev` to Umami. I have less operational history with Caddy than nginx, but nothing about running it has given me reason to reconsider.

#### Cloudflare R2

Serving images directly from the VPS means every request hits the origin, adding latency for visitors further from the server and putting unnecessary load on a machine that is otherwise only serving pre-compressed static files. Cloudflare's R2 moves image storage off the VPS entirely and onto Cloudflare's edge network, so images are delivered from a location close to the visitor with no egress fees. Cloudflare's image optimisation pipeline handles format conversion at the CDN layer, serving WebP where the browser supports it and falling back to JPEG otherwise, with no build-time processing or extra tooling on the server required.

The fallback is handled by a custom Tera ["shortcode"](https://docs.rs/tera-shortcodes/latest/tera_shortcodes/struct.Shortcodes.html).

## Analytics

#### Umami

Privacy runs through the design of this site, which is why [Umami](https://umami.is/) is self-hosted rather than running in the cloud. It's cookieless and GDPR-compliant by default, and visitor data never leaves the server. Routing analytics through a managed service hands that data to a third party, and that cuts against the point.

## Privacy

The same thinking influenced every vendor decision. Providers that required government ID were excluded outright, because I'm not ready to entrust that level of sensitive data with a third party and thus is a risk I'm not willing to accept. 

Payment exposure was factored in too, with virtual cards that can be frozen immediately used where possible, and PayPal providing an additional layer of separation for payment processing. 
