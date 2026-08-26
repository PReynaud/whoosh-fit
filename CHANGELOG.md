# Changelog

## Unreleased

- Pre-commit hook: `simple-git-hooks` + `lint-staged` runs `eslint --fix` on staged JS/TS/Vue files.
- CI Vercel build sets local Supabase demo public env so prerender of `/` works without `.env`.
- Commit current `supabase gen types` output; pin CI Supabase CLI to 2.114.0.

## 0.1.0 — 2026-08-15

- Initial GitHub Template: Nuxt 4, Nuxt UI, Pinia, Supabase auth, PWA, Vitest, Playwright, BMAD, Vercel CI.
