# NaukriDesk – deploy guide
Structure: `db/schema.sql` (database) · `brain/` (auto-ingestion, Node) · `web/` (Next.js site + admin) · `.github/workflows/brain.yml` (runs the brain every 30 min)

## 1. Database
1. Create a Supabase project. SQL editor → run `db/schema.sql`.
2. Authentication → add your admin user, then run:
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email='you@domain.in';`
3. Keep the **service_role key private** (only for the brain). The site uses the public anon key.

## 2. Website (Vercel)
1. Push this folder to a GitHub repo. Vercel → Import → **Root Directory = `web`**.
2. Env vars: copy from `web/.env.example`.
3. Add your domain. Open `/admin`, sign in, add 2–3 sources.

## 3. Brain (GitHub Actions)
Repo → Settings → Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, optional `ANTHROPIC_API_KEY`. Run the workflow once manually.

## 4. Launch checklist
- Search Console → submit `/sitemap.xml`
- Lawyer review of legal pages (templates); cookie consent before personalised ads
- Ads: rows in `ad_campaigns` + `ad_campaign_slots`, or AdSense code in `ad_slots.fallback_html`
- Supabase backups, uptime monitoring, weekly `select * from brain_stats`
- First thing on your machine: `cd web && npm install && npm run build` (verified in a sandbox with Next.js 15.5; re-run on your machine to be sure)

Brain tests: `cd brain && node test.mjs`
