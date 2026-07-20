-- Course branding: accent color / font pairing / nav mode / cover page live in
-- one jsonb column (see CourseTheme in apps/web/src/types.ts). description is
-- real content (cover subtitle), not styling, so it's a plain column.
-- Lessons gain an optional "section" label for grouping in the outline/player nav.

alter table public.courses
  add column theme jsonb,
  add column description text;

alter table public.lessons
  add column section text;
