# WC26 Album Tracker

Static GitHub Pages app for tracking World Cup 2026 album tickets by team and user.

## Local preview

Install dependencies and start Vite:

```bash
npm install
npm run dev
```

Without Supabase configuration, the app runs in local demo mode and saves progress only in the current browser.

## Supabase setup

GitHub Pages cannot run PostgreSQL or MongoDB directly. This app uses Supabase Auth and Supabase PostgreSQL, which gives you a hosted PostgreSQL database and per-user login from a static site.

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `supabase/schema.sql`.
3. In Supabase Authentication settings, add your GitHub Pages URL to the allowed redirect URLs.
4. Copy `.env.example` to `.env`.
5. Replace `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` with your project values.

The Supabase anon key is safe to use in a browser app, but it is still public in the built JavaScript. User privacy is enforced by the row-level security policies in `supabase/schema.sql`.

## GitHub Pages

Build the site and publish the generated `dist` folder:

```bash
npm run build
```

For the included GitHub Actions workflow, add these repository secrets before deploying:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The app uses hash routes like `#/team/BRA`, so it works without custom server rewrites.

## PDF export

Use `Print remaining PDF` in the app, then choose `Save as PDF` in the browser print dialog. The print layout contains only remaining tickets in this format:

```text
FWC 00 1 2 3
MEX 1 5 12
```
