# Project Context

**Product name: Halcyra**

Building Halcyra, a web-based e-learning authoring platform (an independent
competitor to Articulate 360 — own branding, own codebase, no shared
assets/trademarks). Goal: ship a real production MVP on free-tier
infrastructure, upgrade services as revenue allows.

## Branding conventions
- Use "Halcyra" consistently: repo name, package name (`halcyra` /
  `@halcyra/*` scoping for any workspaces), UI copy, email templates, env
  var prefixes (e.g. `HALCYRA_*`).
- Domain/trademark clearance is still pending final confirmation — do not
  hardcode the name into anything hard to change later (e.g. avoid baking
  it into database schema names or external-facing API namespaces that
  would be painful to rename).

## Product scope (v1)
- Web-only authoring tool (skip native desktop app — build the Rise-360-style
  block editor, not the Storyline-style timeline editor, to keep v1 scope sane)
- Course canvas/block editor
- AI-assisted content generation: outlines, drafts, quiz questions, narration, images
- SCORM/xAPI export for LMS compatibility
- Lightweight built-in delivery (Reach-360-style), not a full LMS

## Tech stack
- Frontend: React + TypeScript
- Backend: Node.js + TypeScript
- Database: PostgreSQL via **Supabase** free tier (500MB DB, 1GB storage, 50k MAU,
  commercial use allowed — but free projects auto-pause after 7 days with zero
  traffic; set up a keep-alive ping once live)
- File/media storage: **Supabase Storage for MVP** (public `media` bucket,
  per-user folders, 1GB free / 5GB egress per month — decided 2026-07 to avoid a
  second vendor account). All upload logic lives behind the seam in
  `apps/web/src/lib/media.ts`; migrate to **Cloudflare R2** (10GB free, zero
  egress fees) behind that seam before scale — R2 wins long-term for
  media-heavy content.
- CDN: Cloudflare free plan (pairs with R2)
- Canvas editor: Fabric.js or Konva.js (open source). Worth studying H5P
  (existing open-source interactive-content framework) before building from zero.
- SCORM/xAPI: scorm-again (open-source JS runtime)
- Containerization: Docker

## AI architecture
- **Now (MVP)**: Google Gemini API free tier (Flash/Flash-Lite) for text
  generation — ~1,500 requests/day, no credit card. Keep dev/test on a
  *separate* Google Cloud project from production, since enabling billing on a
  project removes its free tier entirely.
- Image generation: **Pollinations.ai for MVP** (keyless, free, no SLA —
  verified 2026-07 that Gemini image models have zero free-tier API quota,
  429 on every call). Provider lives behind `apps/api/src/image.ts`
  (`HALCYRA_IMAGE_PROVIDER_URL`); generated images are saved into our own
  media storage, never hotlinked. Swap to a paid provider before scale.
- Narration/TTS: Google Cloud TTS free tier or Piper (fully open source,
  self-hosted, no character limits). **Do not use ElevenLabs free tier in
  production** — it's non-commercial only.
- Translation: DeepL free tier or LibreTranslate (open source, self-hosted).
- **Future (own model)**: fine-tune an open-weight model (Qwen3 8B or Gemma4,
  both Apache 2.0) via LoRA/QLoRA on our own curated instructional-design
  content library, using free Colab/Kaggle GPU hours. Self-host inference via
  Ollama/vLLM once volume justifies it. This is the actual differentiation
  moat — same strategy Articulate uses (curated content + prompting, not a
  foundation model).
- Design the AI service layer so swapping the model provider is a config
  change, not a rewrite (hybrid: cheap/free model for routine generation,
  frontier API reserved for harder creative drafting).

## What NOT to copy
Building an independent competitor is fine. Do not copy Articulate's actual
code, trademarks/branding, or their licensed stock-asset library. Use
Unsplash/Pexels/Pixabay APIs (free) for stock imagery instead.

## Reference: free-tier vendor map
| Function | Service |
|---|---|
| Hosting (frontend) | Vercel / Netlify free tier |
| Hosting (backend) | Render / Railway free tier |
| Auth | Supabase Auth or Clerk free tier |
| Email | Resend free tier |
| Error monitoring | Sentry free tier |
| Analytics | PostHog free tier |
| Support chat | Tawk.to |

## Working conventions
- Prioritize a working end-to-end slice (one AI-generated block type, saved,
  rendered) over building out the full editor surface first.
- Flag any place a "free" service's limits would silently break production
  (rate limits, pausing, non-commercial restrictions) rather than assuming
  free == production-safe.
- Never use an unverified API/method/config. Check the installed package
  version, real docs, or types before writing code against a library. If
  uncertain, say so and ask rather than guessing.
- A task is not done until it has actually been run and verified (build,
  typecheck, or the real flow tested) — not just written.
- Don't invent env vars, endpoints, table/column names, or file paths that
  aren't already defined in the repo or this file. Introducing a new one is
  fine — just say explicitly that you're doing it.

## Model & usage conventions (Claude Fable 5)
This project is built using Claude Fable 5 in Claude Code. Fable 5 is priced
well above other Claude models ($10/M input, $50/M output tokens on the API)
and draws down subscription usage limits noticeably faster than Opus per
Anthropic's own in-product guidance, especially with high-effort extended
thinking or multi-subagent fan-out. Work accordingly:
- Scope every session to one vertical slice at a time — don't scaffold the
  whole app surface in a single pass.
- Prefer standard scaffolding CLIs (npm create, supabase init, etc.) over
  hand-written boilerplate.
- Default to low/medium thinking effort; reserve high effort for genuinely
  hard design decisions, not routine implementation.
- Don't spawn parallel subagents without asking first — most tasks here are
  small enough for a single focused pass.
- Don't re-derive or re-ask about decisions already recorded in this file.
- Fable 5 has safety classifiers that can refuse and fall back to another
  model. If a completely legitimate request (e.g. normal auth/security code)
  gets refused, rephrase plainly and directly rather than working around it.
