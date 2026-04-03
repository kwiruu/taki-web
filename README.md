# Taki Docs

Website and documentation app for `@kwiruu/taki-cli`.

Built with React, TypeScript, Vite, MDX, and TanStack Router.

## Requirements

- Node.js 20+
- npm 10+

## Local development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

The app runs on the default Vite port unless overridden.

## Useful scripts

```bash
# start local dev server
npm run dev

# fetch latest CLI metadata snapshot
npm run fetch:cli-data

# production build (fetch + typecheck + vite build)
npm run build

# lint source files
npm run lint
```

## Build output

Production assets are generated in:

```text
dist/
```

## Deployment (Cloudflare Pages)

This repository is intended to be deployed as a static site on **Cloudflare Pages**.

Recommended Git-connected Pages settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

### Important

- This repo does **not** require a Worker runtime for normal hosting.
- There is no `wrangler.toml` in the project because deployment target is Pages static hosting.
- SPA route fallback is configured with `public/_redirects`.

## Data snapshot behavior

`npm run build` runs `scripts/fetch-cli-data.mjs`.

If upstream API calls fail during build, the script writes a partial/fallback snapshot so the site still deploys.

## Project highlights

- MDX docs pages under `src/content`
- Shared UI components under `src/components/ui`
- Site routes/layout in `src/routes/site-pages.tsx`
- Generated CLI metadata in `src/data/generated`
