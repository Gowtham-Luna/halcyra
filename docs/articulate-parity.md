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
| Image (centered/full-width/banner) | 🟡 | Single style; upload + AI generate + URL |
| Image & text / Text on image | ❌ | |
| Gallery (carousel, 2/3/4-col grids) | ❌ | |

### Multimedia blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Video | 🟡 | YouTube/Vimeo/.mp4 embed; no native upload/recording |
| Audio | ❌ | |
| Embed (iframe) | ❌ | |
| Attachment (file download) | ❌ | |
| Code snippet | ❌ | |

### Interactive blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Accordion | ✅ | |
| Tabs | ✅ | |
| Flashcards (grid/stack) | 🟡 | Grid only, text-only faces |
| Labeled graphic (hotspots) | ❌ | High value |
| Process (stepper) | ❌ | High value |
| Timeline | ❌ | |
| Sorting activity | ❌ | |
| Scenario (branching dialogue) | ❌ | Big feature |
| Button / Button stack | 🟡 | Single link button |
| Storyline block | 🚫 | Requires Storyline |

### Knowledge check & quiz
| Articulate | Halcyra | Notes |
|---|---|---|
| Multiple choice | ✅ | With feedback + True/False preset |
| Multiple response | ❌ | |
| Fill in the blank | ❌ | |
| Matching | ❌ | |
| Question bank / draw from bank | ❌ | |
| Quiz lesson (graded, pass mark, retries, shuffle) | ❌ | Needed for SCORM scores |
| Quiz settings: passing score, randomize, timer, retry limit, skip-ahead | ❌ | Part of quiz-lesson slice |

### Charts & dividers
| Articulate | Halcyra | Notes |
|---|---|---|
| Chart (bar/line/pie) | ❌ | |
| Divider | ✅ | |
| Continue button / Numbered divider / Spacer | 🟡 | Continue (gates content) + spacer done; no numbered |
| Block templates (save/reuse) | ❌ | |

## 2. Rise 360 — course-level features
| Feature | Halcyra | Notes |
|---|---|---|
| Content formats: Course / Microlearning (single-page, completion-only) / Guides | 🟡 | Courses only; microlearning = cheap win (one-lesson course + single-page player) |
| Themes (prebuilt + custom) | ❌ | |
| Fonts (pairings, custom fonts) | ❌ | |
| Colors (accent customization) | ❌ | Hardcoded purple |
| Cover page (8 layouts, cover image) | ❌ | |
| Navigation modes (sidebar/compact/overlay) | 🟡 | Sidebar only |
| Sections in lesson list | ❌ | |
| Course description/labels | 🟡 | Topic only |
| Collaborators (co-editing) | ❌ | Big infra |
| Translations (XLIFF, 80+ languages, RTL) | ❌ | DeepL/LibreTranslate planned |
| Duplicate course/lesson | ❌ | Easy win |
| Preview device frames (mobile/tablet) | ❌ | |
| Export: SCORM 1.2 | ✅ | Verified package structure; LMS test pending |
| Export: SCORM 2004 / xAPI / cmi5 | ❌ | |
| Export: PDF / web package | ❌ | |
| Undo/redo in editor | ❌ | |

## 3. AI Assistant
| Feature | Halcyra | Notes |
|---|---|---|
| Course outline generation | ✅ | |
| Full course/lesson drafts | ✅ | Per lesson; no “draft all lessons” (rate limits) |
| Choose draft length | ❌ | |
| Quiz/question generation | 🟡 | MCQ only |
| Block conversion / rewrite / tone | 🟡 | Regenerate per block; no tone controls |
| Summaries | ❌ | |
| AI images | ✅ | Pollinations (no SLA) |
| AI narration/voices + sound FX | ❌ | Piper/Google TTS planned |
| Doc-to-course (extract from PDF/docs) | ❌ | Very high value |
| AI translation | ❌ | |

## 4. Reach 360 (delivery/LMS)
| Feature | Halcyra | Notes |
|---|---|---|
| Public share links | ✅ | Revocable, anon progress in localStorage |
| Learner accounts + registration (link/QR/CSV/SSO) | ❌ | |
| Enrollment (assign courses) | ❌ | |
| Server-side completion tracking | ❌ | Player callbacks ready |
| Reporting (learner/group/content) | ❌ | |
| Groups + delegated managers | ❌ | |
| Libraries + self-enroll catalog | ❌ | |
| Certificates | ❌ | |
| Learning paths | ❌ | |

## 5. Review 360
| Feature | Halcyra | Notes |
|---|---|---|
| Publish draft to review space | 🟡 | Share link exists; no review mode |
| Comments anchored to lesson/slide + general comment tab | ❌ | |
| Resolve/reply threads | ❌ | |
| Version history (re-publish, compare) | ❌ | |
| Password/access-controlled review links | ❌ | |
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

## 8. Peek 360 & Replay 360 (screen/video capture) — ❌ future
Peek: quick screen recordings shared via link or MP4. Replay: screen + webcam
video editing. Halcyra equivalent would be an in-browser screen recorder
(getDisplayMedia → upload to media storage → video block). Real demand exists
for software training; park until after Reach-lite.

## 9. Content Library 360 — 🟡 partial plan
13M+ stock assets: slide/block templates, photos, illustrations, icons,
videos, characters. Halcyra path (never copy theirs): Unsplash/Pexels/Pixabay
APIs for photos (❌ not wired yet — key needed), AI images ✅, block/lesson
templates ❌ (own template system, pairs with "block templates" slice),
characters/icons ❌ (open-source icon sets; characters via AI generation).

## 10. Articulate Localization (add-on)
| Feature | Halcyra | Notes |
|---|---|---|
| AI translation into 80+ languages (Rise + Storyline) | ❌ | Plan: DeepL free tier / LibreTranslate |
| Custom glossaries | ❌ | |
| Language validation in Review 360 (in-context, import back) | ❌ | Depends on Review-lite |
| XLIFF export/import for external vendors | ❌ | |
| Built-in RTL support | ❌ | |
| UI label sets per language | ❌ | |

## 11. Articulate 360 Teams (org/admin tier)
| Feature | Halcyra | Notes |
|---|---|---|
| Simultaneous course editing (Rise) | ❌ | The collaboration slice |
| Shared custom block templates | ❌ | Pairs with block-templates slice |
| Shared team slides/templates (Storyline) | 🚫 | Storyline-bound |
| Team admin: seats, invites, group admins, permissions | ❌ | Needs orgs/roles model — build with billing (slice 10) |
| Enterprise seat/content transfer | ❌ | Post-revenue |
| Consolidated billing | ❌ | Stripe per-org, slice 10 |
| Unlimited/shared storage | 🚫 | Free-tier reality: quotas instead |
| Priority support, health checks, onboarding coaches | n/a | Service, not software |

## 12. Platform-level capabilities
| Capability | Halcyra | Notes |
|---|---|---|
| Accessibility: WCAG 2.1 AA authoring output | ❌ | Fold into design overhaul: semantic markup, focus order, contrast, alt enforcement — cheap now, expensive later |
| RTL language support | ❌ | With localization slice |
| "9x faster with AI" authoring loop | 🟡 | Outline→draft→quiz→images exist; doc-to-course + draft-all missing |

## 13. Articulate 360 Training — n/a
Live + on-demand training with industry experts is a service, not software.
Halcyra equivalent eventually: docs, template gallery, tutorial content.

---

## Build order (one slice per session)

1. **Blocks pack 1 — text & simple**: quote, statement styles, table, checkbox list, two-column, spacer/continue/numbered divider, button
2. **Blocks pack 2 — media**: audio, embed, attachment, gallery (carousel + grids), image style variants
3. **Quiz depth**: multiple response, fill-in-blank, matching; graded quiz lesson with pass mark, retries, shuffle; score → SCORM (`cmi.core.score`)
4. **Blocks pack 3 — interactive**: labeled graphic, process, timeline, sorting; flashcard images
5. **Course branding**: themes, accent color, fonts, cover page, navigation options, sections, duplicate course
6. **Design overhaul**: design system pass across editor/player/dashboard/auth (pairs with 5) — includes the WCAG 2.1 AA accessibility baseline (semantic markup, focus order, contrast, alt enforcement)
7. **AI expansion**: doc-to-course extraction, draft-all-lessons queue, tone/rewrite controls, summaries, TTS narration (Piper/Google free tier)
8. **Reach-lite**: learner accounts, enrollment, server-side progress/completion, basic reporting dashboard, certificates
9. **Review-lite**: comment threads on lessons, reviewer share mode
10. **Exports**: SCORM 2004 + xAPI, PDF export
11. **Localization**: DeepL/LibreTranslate pipeline, label sets, RTL
12. **Collaboration/scale** (post-revenue): co-editing, orgs/teams with roles + seat admin, shared block templates, question banks, charts, scenario branching, undo/redo, screen recording (Peek-equivalent)

Sources: [Rise lesson/block types](https://www.articulatesupport.com/article/Rise-Lesson-and-Block-Types) · [Articulate 360 suite](https://www.articulate.com/360/) · [Articulate 360 Teams](https://www.articulate.com/360/teams/) · [AI Assistant features](https://www.articulatesupport.com/article/AI-Assistant-Storyline-360-and-Rise-360-Features) · [Reach 360 features](https://www.articulatesupport.com/article/Reach-360-All-Features) · [Rise theme/settings](https://www.articulatesupport.com/article/Rise-360-Personalize-the-Theme) · [Storyline all features](https://www.articulate.com/360/storyline/all/) · [Rise quiz settings](https://www.articulatesupport.com/article/Rise-Quiz-Settings) · [Localization overview](https://www.articulatesupport.com/article/Articulate-Localization-Overview)
