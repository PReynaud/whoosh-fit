# WhooshFit

Patch [MyWhoosh](https://event.mywhoosh.com/user/activities) `.fit` files so Garmin Connect treats them as a **Garmin Edge 1030 Plus**, then import them on [Garmin Connect](https://connect.garmin.com/modern/import-data).

Live: https://whoosh-fit.pierre-reynaud.fr

## What it does

1. You download the activity from MyWhoosh (no public API, so this stays manual).
2. Drop the `.fit` or `.dms` file on the page. The device field is rewritten **in the browser** with the same Garmin manufacturer / Edge 1030 Plus product id as `modifier-fit.bat`.
3. The patched file downloads automatically. Open Garmin Connect import while signed in and drop that file.

Garmin Connect cannot receive the file automatically from this site. The import page lives on `connect.garmin.com`; the browser will not send those cookies to this app.

There is **no hosted Supabase project**. Local Supabase remains only so template auth e2e still runs.

## Stack

- Nuxt 4, Nuxt UI 4, Pinia
- `@garmin/fitsdk` (client-side decode / encode)
- Playwright (local Supabase only) and Vitest
- PWA via `@vite-pwa/nuxt`

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:start
pnpm db:reset
pnpm db:types
pnpm pwa:icons
pnpm dev
```

Local auth pages still work against local Supabase. Production does not use them.

## Tests

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:e2e
```

A pre-commit hook runs `eslint --fix` on staged JS/TS/Vue files. Do not skip it with `--no-verify`.

## Language

Conversation may be English or French. All produced artifacts are English.
