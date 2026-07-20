-- Localization: a course's locale drives which UI label set the player uses
-- and whether it renders right-to-left. Translated *content* is a separate,
-- ordinary course produced by the AI translation pipeline (Dashboard "🌐
-- Translate") — it reuses the existing duplicate-course path, so no new
-- content storage is needed here, just the locale tag itself.

alter table public.courses
  add column locale text not null default 'en';
