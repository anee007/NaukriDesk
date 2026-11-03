-- NaukriDesk full schema v2 (Supabase / Postgres 15+)
create extension if not exists pgcrypto;
create type post_type   as enum ('job','result','admit','key','syl','adm');
create type post_status as enum ('pending_review','published','archived','rejected');

create or replace function is_admin() returns boolean language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

-- ===== portals the brain watches =====
create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url  text not null check (url ~ '^https://'),
  allow text[] not null,                      -- domains the brain may fetch, e.g. {'upsc.gov.in'}
  trust text not null default 'low' check (trust in ('low','high')),
  enabled boolean not null default true,
  fail_count int not null default 0,          -- circuit breaker: brain disables at 5
  last_ok timestamptz, last_error text,
  created_at timestamptz not null default now()
);
create table raw_items (                      -- every page the brain has already seen
  id bigserial primary key,
  source_id uuid references sources(id) on delete cascade,
  url text not null, content_hash text not null,
  fetched_at timestamptz not null default now(),
  unique (url, content_hash)
);

-- ===== posts =====
create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  dedupe_key text unique not null,
  type post_type not null,
  title text not null check (length(title) between 5 and 160),
  org text not null default '',
  state text not null default 'All India',
  qualification text not null default 'Graduate',
  total_posts int check (total_posts is null or total_posts >= 0),
  last_date date,
  source_url text not null check (source_url ~ '^https://'),
  source_id uuid references sources(id),
  status post_status not null default 'pending_review',
  auto_published boolean not null default false,
  confidence int check (confidence between 0 and 100),
  needs_review boolean not null default false,  -- live post with a proposed risky change waiting
  review_reason text,
  reviewed_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as
    (to_tsvector('simple', coalesce(title,'')||' '||coalesce(org,'')||' '||coalesce(state,''))) stored,
  constraint publish_needs_basis check (status <> 'published' or auto_published or reviewed_by is not null)
);
create index posts_feed   on posts (type, status, published_at desc);
create index posts_closing on posts (last_date) where status = 'published';
create index posts_fts    on posts using gin (fts);
create index posts_queue  on posts (confidence desc) where status = 'pending_review' or needs_review;

create table post_revisions (                 -- full audit trail of every change
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  changed jsonb not null,                     -- {field:{from,to}}
  applied boolean not null default true,      -- false = proposed, waiting for admin
  applied_at timestamptz, by text not null default 'brain',
  created_at timestamptz not null default now()
);

create or replace function touch() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger posts_touch before update on posts for each row execute function touch();

-- ===== one-click admin actions =====
create or replace function approve_post(p_id uuid) returns void language plpgsql security definer as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update posts set status='published', reviewed_by=auth.uid(), published_at=coalesce(published_at,now()),
         needs_review=false, review_reason=null where id=p_id;
end $$;
create or replace function reject_post(p_id uuid) returns void language plpgsql security definer as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  update posts set status='rejected', reviewed_by=auth.uid() where id=p_id;
end $$;
create or replace function apply_revision(p_rev uuid) returns void language plpgsql security definer as $$
declare r post_revisions;
begin
  if not is_admin() then raise exception 'admin only'; end if;
  select * into r from post_revisions where id = p_rev and not applied;
  if not found then return; end if;
  update posts set
    last_date   = case when r.changed ? 'last_date'   then nullif(r.changed->'last_date'->>'to','')::date else last_date end,
    total_posts = case when r.changed ? 'total_posts' then nullif(r.changed->'total_posts'->>'to','')::int else total_posts end,
    needs_review = false, review_reason = null
  where id = r.post_id;
  update post_revisions set applied = true, applied_at = now() where id = p_rev;
end $$;

create view admin_queue with (security_invoker = true) as
  select id, title, type, org, state, last_date, confidence, review_reason, needs_review, source_url, created_at
  from posts where status = 'pending_review' or needs_review order by confidence desc nulls last, created_at;
create view brain_stats with (security_invoker = true) as
  select count(*) as total,
         count(*) filter (where auto_published) as auto_published,
         count(*) filter (where reviewed_by is not null) as human_reviewed,
         round(100.0 * count(*) filter (where auto_published) / nullif(count(*),0), 1) as auto_pct
  from posts where status in ('published','archived');

-- ===== advertising =====
create table ad_slots (
  key text primary key, label text not null, placement text not null,
  width int, height int, device text not null default 'all' check (device in ('all','mobile','desktop')),
  max_per_page int not null default 1, enabled boolean not null default true,
  fallback_html text                          -- e.g. your AdSense unit when no direct campaign matches
);
create table ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  advertiser text not null, name text not null,
  status text not null default 'draft' check (status in ('draft','active','paused','ended')),
  starts_at timestamptz not null, ends_at timestamptz,
  creative_url text not null check (creative_url ~ '^https://'),   -- image only; no third-party HTML
  alt_text text not null default '', click_url text not null check (click_url ~ '^https://'),
  weight int not null default 1 check (weight > 0),
  target_types post_type[], target_states text[], daily_impression_cap int,
  created_at timestamptz not null default now()
);
create table ad_campaign_slots (
  campaign_id uuid references ad_campaigns(id) on delete cascade,
  slot_key text references ad_slots(key) on delete cascade,
  primary key (campaign_id, slot_key)
);
create table ad_stats (
  day date not null, campaign_id uuid references ad_campaigns(id) on delete cascade,
  slot_key text references ad_slots(key) on delete cascade,
  impressions bigint not null default 0, clicks bigint not null default 0,
  primary key (day, campaign_id, slot_key)
);
create or replace function ad_track(p_campaign uuid, p_slot text, p_kind text) returns void language sql security definer as $$
  insert into ad_stats (day, campaign_id, slot_key, impressions, clicks)
  values (current_date, p_campaign, p_slot, (p_kind='impression')::int, (p_kind='click')::int)
  on conflict (day, campaign_id, slot_key) do update
    set impressions = ad_stats.impressions + (p_kind='impression')::int,
        clicks      = ad_stats.clicks + (p_kind='click')::int $$;

insert into ad_slots (key,label,placement,width,height,device,max_per_page) values
 ('header_leaderboard','Top banner','Below header, all pages',728,90,'desktop',1),
 ('header_mobile','Top banner (mobile)','Below header, all pages',320,100,'mobile',1),
 ('feed_inline','In-feed card','After every 6th card in the list',300,250,'all',3),
 ('sidebar_rect','Sidebar rectangle','Right column on post pages',300,250,'desktop',1),
 ('post_top','Post page top','Above notice details',728,90,'all',1),
 ('post_bottom','Post page bottom','Below official link button',728,90,'all',1),
 ('mobile_sticky','Mobile sticky footer','Fixed bottom bar',320,50,'mobile',1);

-- ===== row level security =====
alter table sources enable row level security;        alter table raw_items enable row level security;
alter table posts enable row level security;          alter table post_revisions enable row level security;
alter table ad_slots enable row level security;       alter table ad_campaigns enable row level security;
alter table ad_campaign_slots enable row level security; alter table ad_stats enable row level security;
create policy pub_posts  on posts for select using (status = 'published');
create policy pub_slots  on ad_slots for select using (enabled);
create policy pub_camps  on ad_campaigns for select using (status = 'active' and starts_at <= now() and (ends_at is null or ends_at >= now()));
create policy pub_cslots on ad_campaign_slots for select using (true);
create policy adm_posts  on posts for all using (is_admin()) with check (is_admin());
create policy adm_src    on sources for all using (is_admin()) with check (is_admin());
create policy adm_raw    on raw_items for all using (is_admin()) with check (is_admin());
create policy adm_rev    on post_revisions for all using (is_admin()) with check (is_admin());
create policy adm_slots  on ad_slots for all using (is_admin()) with check (is_admin());
create policy adm_camps  on ad_campaigns for all using (is_admin()) with check (is_admin());
create policy adm_cs     on ad_campaign_slots for all using (is_admin()) with check (is_admin());
create policy adm_stats  on ad_stats for select using (is_admin());
-- The brain uses the service-role key, which bypasses RLS. Never ship that key to the browser.

-- Example source (verify the real listing URL and the site's terms/robots.txt first):
-- insert into sources (name,url,allow,trust) values ('Example Commission','https://example.gov.in/recruitment/',array['example.gov.in'],'high');
