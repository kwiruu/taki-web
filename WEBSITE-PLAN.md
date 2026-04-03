# Taki Website Plan (Phase 2)

## Goal

Build a separate website repository for Taki as the product showcase, docs front door, and release visibility layer, while keeping CLI code and releases in taki-cli as source of truth.

## Confirmed Decisions

- Repo: taki-docs (separate from taki-cli)
- Hosting: Cloudflare Pages
- Stack: React + Vite + TypeScript
- UI: Tailwind CSS + shadcn/ui (installed via shadcn CLI)
- Routing: TanStack Router
- Data: TanStack Query
- Docs: MDX in-repo
- Freshness: build-time API fetch + release-trigger refresh + nightly fallback

## Why Separate Repo

- Independent content and design deploy velocity
- Cleaner CI and secrets boundaries
- Easier collaboration with non-CLI contributors
- Lower risk to CLI release flow

## Content Scope

### Hero

- Explain Taki for local multi-service workflows
- Show install command and quick start CTA

### Feature Coverage

- Commands and options from src/bin/cli.ts
- Dashboard controls and layouts from src/ui/app.tsx
- Theme catalog from src/theme/index.ts
- Config and health checks from README.md

### Trust and Reliability

- Release automation flow from release-please workflow/config
- Publish pipeline story from publish workflow
- CI quality gate posture from ci workflow

### Docs Pages

- Install and first run
- Command reference
- Dashboard and shortcuts
- Theme catalog
- Config schema and health checks
- Troubleshooting and platform notes
- Releases/changelog links

## Cross-Repo Integration

### Build-Time Data Cards

- GitHub repo stats: stars, forks, open issues
- Latest GitHub release: version/date/link
- npm package info: latest version

### Cross-Links

- Bug report button -> CLI issues page
- Feature request button -> CLI discussions/issues route
- Release cards -> CLI release pages

### Auth Model

- Website CI uses GITHUB_TOKEN for read-only API fetch where possible
- NPM_TOKEN remains only in CLI publish workflow
- Use scoped PAT only if organization policy blocks defaults

## Delivery Plan

### Phase 2A (MVP)

- Homepage
- Core docs shell and baseline pages
- Command/config/trust content

### Phase 2B (Live Data)

- Release/stars/issues/npm cards
- Fallback snapshot and refresh timestamp

### Phase 2C (Governance)

- Issue templates and routing boundaries
- Automated website refresh on CLI releases

### Phase 2D (Growth)

- Interactive command walkthrough
- Versioned docs and migration guides
- Recipes (Node, Python, full-stack)

## Same-Day Build Order

1. Scaffold Vite + TS app
2. Initialize Tailwind + shadcn via CLI
3. Add TanStack Router/Query + MDX dependencies
4. Create docs routes and content placeholders
5. Add minimum live cards (release + npm + stars)
6. Deploy to Cloudflare Pages and smoke test

## Verification Checklist

- App builds locally and in CI
- Docs routes load on desktop and mobile
- Command/config docs match current CLI behavior
- Live cards show valid data and refresh timestamp
- Cross-links to CLI issues/releases work

## Source of Truth Mapping

- taki-cli/src/bin/cli.ts
- taki-cli/src/ui/app.tsx
- taki-cli/src/theme/index.ts
- taki-cli/README.md
- taki-cli/.github/workflows/ci.yml
- taki-cli/.github/workflows/publish.yml
- taki-cli/.github/workflows/release-please.yml
- taki-cli/release-please-config.json
- taki-cli/.release-please-manifest.json
- taki-cli/package.json
