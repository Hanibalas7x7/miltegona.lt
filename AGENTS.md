# miltegona.lt

Static site + admin panel (`/kontrole/`) + Supabase Edge Functions for UAB
"Miltegona" (powder-coating company). Plain HTML/CSS/JS, no build step — see
`README.md` for the full file layout, which is accurate and should be the
first thing read.

## Backend has migrated — several in-repo docs are stale
Per repo memory (dell-server-supabase-layout), this project's backend moved
from the cloud Supabase project to the self-hosted `main.miltegona.lt`
instance (`miltegona_supabase` on the Dell server). **Several committed `.md`
files still reference the old setup and are outdated**:
- `EDGE_FUNCTION_DEPLOY.md`, `DEPLOY_PAINT_SYSTEM.md`,
  `PAINT_MANAGEMENT_DEPLOYMENT.md`, `SEO_DEPLOYMENT_GUIDE.md` reference the old
  cloud project ref (`xyzttzqvbescdpihvyfu` / `vzjnywppcnhgxdjvvgvn`) and old
  local paths (`e:\Users\Bart\...`, `c:\Users\Miltegona\miltegona.lt`).
- Current reality: `js/kontrole.js` and `js/paint-management.js` call
  `https://main.miltegona.lt/functions/v1/...` — **that's the live backend**.
  Don't follow the cloud project-ref deploy commands in the older docs; deploy
  Edge Functions against the self-hosted instance instead (see repo memory for
  the Dell server SSH/docker-compose details).
- The scheduled `update-sitemap.yml` workflow already correctly fetches from
  `main.miltegona.lt`.

## Security convention (from README, keep enforcing)
This repo must never contain Supabase service-role keys, passwords, or
private API keys — those belong in Supabase Secrets / deployment env only.
The admin panel's password check and gate-code validation happen through
rate-limited Edge Functions (`validate-password`, `validate-and-open`), not
client-side secrets.

## Key features
- `/kontrole/` admin panel: gate-code generation/management, gallery
  image upload (`js/kontrole.js` + Edge Function `manage-gallery`), and a paint
  inventory system (`js/paint-management.js`, OCR label scanning via
  `scan-paint-label` Edge Function).
- `supabase/functions/sitemap`: generates the dynamic XML sitemap (including
  `<image:image>` entries for gallery photos) — auto-refreshed daily by
  `.github/workflows/update-sitemap.yml`, committing straight to `main`.
- Related apps that talk to the same `main.miltegona.lt` backend:
  `gate_control_device`, `Atidaryti_vartus` (different Supabase project — cloud,
  not self-hosted — don't assume they share it), `light_control_windows`.

## Local dev
```bash
python -m http.server 8000
```
No install/build step — it's a static site (see README for Live Server
alternative).
