# Articulate 360 → Halcyra feature parity map

Researched 2026-07-16 from Articulate's current docs. This is the master
checklist for building Halcyra to competitive parity, one slice at a time.
Statuses: ✅ done · 🟡 partial · ❌ missing · 🚫 out of scope for v1.

Articulate 360's current product nav (verified on articulate.com/360,
2026-07-16): **AI Assistant**, **Rise** (web block editor — our v1 target),
**Storyline** (desktop timeline editor — 🚫 per project scope),
**Localization**, **Review**, **Reach** (built-in LMS), plus **Content
Library 360**, **Articulate 360 Teams** (org/admin tier), and **Articulate
360 Training** (service). The site groups platform capabilities as
Create / Collaborate / Distribute / Scale, and headlines WCAG 2.1 AA
accessibility, RTL support, and 80+ language AI translation. Studio 360,
Peek 360, and Replay 360 are no longer on the main product nav (legacy apps
still in the subscription; documented below for completeness).

---

## 1. Rise 360 — block types

### Text blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Paragraph | ✅ | Rich text (bold/italic/links/lists) |
| Paragraph with heading/subheading | 🟡 | Compose heading + paragraph blocks manually |
| Heading / Subheading | ✅ | H2/H3 |
| Two column | ✅ | Two rich-text columns (not nested blocks) |
| Table | ✅ | Editable header + rows |

### Statement / quote blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Statement (A–D styles) + Note | ✅ | Statement (bold/accent) + callout for notes |
| Quote (A–D, on image, carousel) | 🟡 | One clean style with attribution; no on-image/carousel |

### List blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Bulleted / Numbered | ✅ | |
| Checkbox list | ✅ | Interactive (learner can tick) |

### Image & gallery blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Image (centered/full-width/banner) | ✅ | Style select added; upload + AI generate + URL |
| Image & text / Text on image | ✅ | Left/right/overlay layouts |
| Gallery (carousel, 2/3/4-col grids) | ✅ | |

### Multimedia blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Video | 🟡 | YouTube/Vimeo/.mp4 embed; no native upload/recording |
| Audio | ✅ | Upload (mp3/wav/ogg/m4a, 15MB) + URL |
| Embed (iframe) | ✅ | Sandboxed iframe, configurable height |
| Attachment (file download) | ✅ | Upload (pdf/doc/ppt/xls/zip/txt, 15MB) + URL |
| Code snippet | ❌ | |

### Interactive blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Accordion | ✅ | |
| Tabs | ✅ | |
| Flashcards (grid/stack) | 🟡 | Grid only; optional image per card face now supported |
| Labeled graphic (hotspots) | ✅ | Click image to place a pin; click-to-reveal popup |
| Process (stepper) | ✅ | Numbered vertical steps |
| Timeline | ✅ | Label/date + title + description |
| Sorting activity | ✅ | Categorize via dropdown (accessible, no drag-and-drop) |
| Scenario (branching dialogue) | 🟡 | Speaker/line/choices node graph, click-through player; no variables/conditions or characters library |
| Button / Button stack | 🟡 | Single link button |
| Storyline block | 🚫 | Requires Storyline |

### Knowledge check & quiz
| Articulate | Halcyra | Notes |
|---|---|---|
| Multiple choice | ✅ | With feedback + True/False preset |
| Multiple response | ✅ | Checkbox select-all-correct |
| Fill in the blank | ✅ | Multi-blank, comma-separated accepted answers |
| Matching | ✅ | Dropdown-per-item (shuffled right column) |
| Question bank / draw from bank | ✅ | Quiz lesson draws N random questions from the pool each attempt (`drawCount` setting) |
| Quiz lesson (graded, pass mark, retries, shuffle) | ✅ | Deferred grading, aggregate score, retry limit |
| Quiz settings: passing score, randomize, timer, retry limit, skip-ahead | 🟡 | Pass mark/shuffle/retries done; no timer or skip-ahead |

### Charts & dividers
| Articulate | Halcyra | Notes |
|---|---|---|
| Chart (bar/line/pie) | ✅ | Hand-rolled SVG, single series (no new charting dependency) |
| Divider | ✅ | |
| Continue button / Numbered divider / Spacer | 🟡 | Continue (gates content) + spacer done; no numbered |
| Block templates (save/reuse) | ✅ | Save any block as a template; personal or shared with your org |

## 2. Rise 360 — course-level features
| Feature | Halcyra | Notes |
|---|---|---|
| Content formats: Course / Microlearning (single-page, completion-only) / Guides | 🟡 | Courses only; microlearning = cheap win (one-lesson course + single-page player) |
| Themes (prebuilt + custom) | 🟡 | 4 font pairings + 6 accent presets + custom hex; no full prebuilt theme templates |
| Fonts (pairings, custom fonts) | 🟡 | 4 curated system-font pairings; no arbitrary font upload |
| Colors (accent customization) | ✅ | Preset swatches + custom picker, driven by CSS custom properties |
| Cover page (8 layouts, cover image) | 🟡 | 3 layouts (centered/left/minimal) vs Articulate's 8 |
| Navigation modes (sidebar/compact/overlay) | ✅ | All three implemented |
| Sections in lesson list | ✅ | Per-lesson label, grouped in outline + player nav |
| Course description/labels | ✅ | Editable description (cover subtitle) + topic |
| Collaborators (co-editing) | 🟡 | Org-shared courses grant real edit access (RLS-backed) + presence awareness (who else has this lesson open); no conflict-free real-time merging — last save wins, with a warning |
| Translations (XLIFF, 80+ languages, RTL) | 🟡 | DeepL-powered course translation + RTL layout — see section 10 |
| Duplicate course/lesson | ✅ | Deep copy incl. blocks/quiz settings |
| Preview device frames (mobile/tablet) | ❌ | |
| Export: SCORM 1.2 | ✅ | Package structure + cmi.core.score.raw/passed-failed on graded quiz lessons; LMS test pending |
| Export: SCORM 2004 / xAPI / cmi5 | 🟡 | SCORM 2004 (completion_status/success_status/score.scaled) and xAPI (launched/completed/scored/terminated statements via the xAPI Launch convention) added — one shared auto-detecting player bundle covers 1.2/2004/xAPI; no cmi5. Package structures verified; real LMS/LRS test pending |
| Export: PDF / web package | 🟡 | Print-to-PDF full-course view (browser print, not a generated PDF file); no bundled "web package" zip |
| Undo/redo in editor | ✅ | Debounced snapshot history per lesson, Ctrl+Z/Ctrl+Shift+Z + toolbar buttons |

## 3. AI Assistant
| Feature | Halcyra | Notes |
|---|---|---|
| Course outline generation | ✅ | |
| Full course/lesson drafts | ✅ | Per lesson, or "Draft all empty lessons" queued across a course (paced under the AI rate limit) |
| Choose draft length | ❌ | |
| Quiz/question generation | 🟡 | MCQ, multiple response, fill-in-blank; no matching |
| Block conversion / rewrite / tone | ✅ | Regenerate per block with a tone preset (concise/formal/casual/simpler) or default rewrite |
| Summaries | ✅ | One-click callout summary appended to a lesson |
| AI images | ✅ | Pollinations (no SLA) |
| AI narration/voices + sound FX | 🟡 | Google Cloud TTS on audio blocks (2 voices); no sound FX. Requires a separate GCP project with billing enabled — see .env.example |
| Doc-to-course (extract from PDF/docs) | ✅ | PDF/DOCX/TXT upload → AI outline, from the dashboard |
| AI translation | ❌ | |

## 4. Reach 360 (delivery/LMS)
| Feature | Halcyra | Notes |
|---|---|---|
| Public share links | ✅ | Revocable; anon progress in localStorage, or server-side if the learner signs in |
| Learner accounts + registration (link/QR/CSV/SSO) | 🟡 | Email/password sign-in on the share link (reuses Supabase Auth); no QR/CSV bulk import or SSO |
| Enrollment (assign courses) | 🟡 | Self-enroll on sign-in only — authors can't assign/invite by email yet (no email service wired up) |
| Server-side completion tracking | ✅ | Per-lesson completion rows once a learner signs in |
| Reporting (learner/group/content) | 🟡 | Per-course learner roster + completion % ("👥 Reports" in the course editor); no group/content-level rollups |
| Groups + delegated managers | ❌ | |
| Libraries + self-enroll catalog | ❌ | |
| Certificates | 🟡 | Printable HTML certificate (browser print-to-PDF) once a signed-in learner finishes; no stored certificate record |
| Learning paths | ❌ | |

## 5. Review 360
| Feature | Halcyra | Notes |
|---|---|---|
| Publish draft to review space | ✅ | Dedicated reviewer link, distinct from the learner share link, read-only + comments, no sign-in needed |
| Comments anchored to lesson/slide + general comment tab | ✅ | Per-lesson threads + a general course-level tab |
| Resolve/reply threads | 🟡 | Author can resolve; no nested reply threading (a reply is just another comment in the same thread) |
| Version history (re-publish, compare) | ❌ | |
| Password/access-controlled review links | ❌ | Same unguessable-UUID model as the public share link, not a real password |
| Language validation workflow (with Localization) | ❌ | |

## 6. Storyline 360 — full inventory (🚫 all of it for v1)
Documented for completeness; the freeform timeline/canvas paradigm is
explicitly out of v1 scope (CLAUDE.md). Revisit only if customer demand
proves it. Key capabilities: scenes/slides with timeline editor; slide
layers (incl. modal dialog layers); object states (hover/selected/custom);
trigger system (event → action, with conditions); variables (number, text,
true/false) + conditional logic; motion paths, 15 entrance/exit animations,
17 transitions; 25 question types incl. freeform (drag-and-drop, hotspot,
pick-many…); question pools + randomization; screen recording with
step-by-step playback modes; characters (photographic + illustrated);
dials/sliders; 360° image / VR interactions; accessibility checker; AI
Assistant integration (incl. audio-sync of objects/animations); publishes to
web, Review 360, LMS (SCORM/xAPI/cmi5), and as a block inside Rise.

## 7. Studio 360 (Presenter / Quizmaker / Engage) — 🚫
PowerPoint-based Windows authoring (slides → course), standalone quiz maker,
prebuilt interaction templates. Legacy paradigm; Halcyra's block editor +
future template library covers the same jobs. No parity work planned.

## 8. Peek 360 & Replay 360 (screen/video capture) — 🟡 Peek-equivalent shipped
Peek: quick screen recordings shared via link or MP4. Replay: screen + webcam
video editing. Halcyra has the Peek half: in-browser screen recorder
(getDisplayMedia → MediaRecorder → upload to media storage → video block, "🔴
Record screen" on the video block editor). No Replay-equivalent editing
(trim/webcam overlay) — recordings upload as-is, 50MB cap on the free-tier
storage bucket.

## 9. Content Library 360 — 🟡 partial plan
13M+ stock assets: slide/block templates, photos, illustrations, icons,
videos, characters. Halcyra path (never copy theirs): Unsplash/Pexels/Pixabay
APIs for photos (❌ not wired yet — key needed), AI images ✅, block/lesson
templates ✅ (own template system — save any block, personal or org-shared),
characters/icons ❌ (open-source icon sets; characters via AI generation).

## 10. Articulate Localization (add-on)
| Feature | Halcyra | Notes |
|---|---|---|
| AI translation into 80+ languages (Rise + Storyline) | 🟡 | DeepL-powered "🌐 Translate" produces a full translated course copy (content + block text); ~10 languages offered in the picker (as many as DeepL supports, just not exhaustively listed); LibreTranslate not wired up (self-hosting doesn't fit free-tier infra — see translate.ts) |
| Custom glossaries | ❌ | |
| Language validation in Review 360 (in-context, import back) | ❌ | Depends on Review-lite |
| XLIFF export/import for external vendors | ❌ | |
| Built-in RTL support | 🟡 | `dir="rtl"` + logical CSS properties on the player, lists, quotes, comments, timeline/process; not an exhaustive mirror-everything pass (e.g. overlay-sidebar positioning still physical) |
| UI label sets per language | 🟡 | Player chrome strings (Continue, Submit quiz, etc.) seeded for English/Spanish/French; other locales fall back to English text even though content itself translates fine |

## 11. Articulate 360 Teams (org/admin tier)
| Feature | Halcyra | Notes |
|---|---|---|
| Simultaneous course editing (Rise) | 🟡 | Org members get real edit access to org-owned courses + presence awareness; no live cursor/conflict-free merge |
| Shared custom block templates | ✅ | Personal or org-shared, via `block_templates.org_id` |
| Shared team slides/templates (Storyline) | 🚫 | Storyline-bound |
| Team admin: seats, invites, group admins, permissions | 🟡 | Create orgs, invite by email (claimed on next sign-in, no email delivery), owner/admin/member roles, remove members. No seat limits or group-of-groups |
| Enterprise seat/content transfer | ❌ | Post-revenue |
| Consolidated billing | ❌ | Deliberately not built this pass — real Stripe payment collection needs business/legal decisions (pricing, entity, tax, ToS, refunds) that are the user's to make, not something to wire up unprompted |
| Unlimited/shared storage | 🚫 | Free-tier reality: quotas instead |
| Priority support, health checks, onboarding coaches | n/a | Service, not software |

## 12. Platform-level capabilities
| Capability | Halcyra | Notes |
|---|---|---|
| Accessibility: WCAG 2.1 AA authoring output | 🟡 | ARIA labels/roles on icon-only controls, accordion/tabs semantics, skip link, visible focus on rich text, reduced-motion support, soft alt-text nudges, low-contrast text bumped to AA. Not done: per-input `<label>` elements (placeholder-only across most fields), no automated contrast audit or screen-reader pass |
| RTL language support | 🟡 | See section 10 |
| "9x faster with AI" authoring loop | ✅ | Outline→draft→quiz→summary→images→narration, plus doc-to-course and draft-all-lessons |

## 13. Articulate 360 Training — n/a
Live + on-demand training with industry experts is a service, not software.
Halcyra equivalent eventually: docs, template gallery, tutorial content.

---

## Build order (one slice per session)

All 12 slices below are done, each at a deliberately "lite" scope (noted 🟡
in the tables above where something real but partial), with one standing
exception: **Stripe billing/payment collection was not built** — it needs
business/legal decisions (pricing, entity, tax handling, refund policy, ToS)
that are the user's to make, not something to wire up unprompted. Everything
else in slice 12, including the org/team data model and roles, shipped
without it.

1. ✅ **Blocks pack 1 — text & simple**: quote, statement styles, table, checkbox list, two-column, spacer/continue/numbered divider, button
2. ✅ **Blocks pack 2 — media**: audio, embed, attachment, gallery (carousel + grids), image style variants
3. ✅ **Quiz depth**: multiple response, fill-in-blank, matching; graded quiz lesson with pass mark, retries, shuffle; score → SCORM (`cmi.core.score`)
4. ✅ **Blocks pack 3 — interactive**: labeled graphic, process, timeline, sorting; flashcard images
5. ✅ **Course branding**: themes, accent color, fonts, cover page, navigation options, sections, duplicate course
6. 🟡 **Design overhaul**: WCAG 2.1 AA accessibility baseline shipped (semantic markup, focus order, contrast, alt nudges); no general visual redesign pass (needs a browser to judge, which this environment doesn't have)
7. ✅ **AI expansion**: doc-to-course extraction, draft-all-lessons queue, tone/rewrite controls, summaries, TTS narration (Google Cloud TTS)
8. ✅ **Reach-lite**: learner accounts, enrollment, server-side progress/completion, basic reporting dashboard, certificates
9. ✅ **Review-lite**: comment threads on lessons, reviewer share mode
10. ✅ **Exports**: SCORM 2004 + xAPI, PDF export
11. ✅ **Localization**: DeepL translation pipeline, label sets (EN/ES/FR), RTL
12. 🟡 **Collaboration/scale**: co-editing (org access + presence, not live merge), orgs/teams with roles (no seat limits/billing), shared block templates, question banks, charts, scenario branching, undo/redo, screen recording (Peek-equivalent)

None of this has been exercised against a real LMS, LRS, or in an actual
browser session by a human — every slice was verified by typecheck + build
only. Treat it as implemented-and-unverified, not production-tested.

Sources: [Rise lesson/block types](https://www.articulatesupport.com/article/Rise-Lesson-and-Block-Types) · [Articulate 360 suite](https://www.articulate.com/360/) · [Articulate 360 Teams](https://www.articulate.com/360/teams/) · [AI Assistant features](https://www.articulatesupport.com/article/AI-Assistant-Storyline-360-and-Rise-360-Features) · [Reach 360 features](https://www.articulatesupport.com/article/Reach-360-All-Features) · [Rise theme/settings](https://www.articulatesupport.com/article/Rise-360-Personalize-the-Theme) · [Storyline all features](https://www.articulate.com/360/storyline/all/) · [Rise quiz settings](https://www.articulatesupport.com/article/Rise-Quiz-Settings) · [Localization overview](https://www.articulatesupport.com/article/Articulate-Localization-Overview)
