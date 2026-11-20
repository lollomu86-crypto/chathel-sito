-- ChatHel · visite del sito di presentazione (chathel.com).
-- Da eseguire UNA volta in Supabase → SQL Editor (progetto ChatHel), prima di pubblicare il pannello delle visite.
-- Scrivono e leggono solo le funzioni del sito (api/visit.js, api/visits.js) con la chiave service role:
-- nessuna policy RLS, quindi i client (anon, authenticated) non vedono e non scrivono nulla.
-- Non si salva l'indirizzo IP: la città arriva da Vercel; "visitor" è un codice anonimo che cambia ogni giorno.

create table if not exists public.site_visits (
  id        bigint generated always as identity primary key,
  ts        timestamptz not null default now(),
  path      text not null check (char_length(path) <= 80),
  hotel     text check (hotel is null or hotel ~ '^[a-z0-9-]{1,60}$'),
  city      text check (char_length(city) <= 80),
  region    text check (char_length(region) <= 80),
  country   text check (char_length(country) <= 8),
  device    text check (device in ('mobile', 'tablet', 'desktop')),
  browser   text check (char_length(browser) <= 40),
  os        text check (char_length(os) <= 40),
  referrer  text check (char_length(referrer) <= 120),
  visitor   text check (char_length(visitor) <= 32)
);

create index if not exists site_visits_ts_idx on public.site_visits (ts desc);
create index if not exists site_visits_hotel_idx on public.site_visits (hotel, ts desc) where hotel is not null;

alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;

comment on table public.site_visits is
  'Visite di chathel.com (sito per i direttori). Solo service role. Niente IP. Da cancellare dopo 13 mesi (vedi README del sito).';
