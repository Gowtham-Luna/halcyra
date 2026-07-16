# Articulate 360 → Halcyra feature parity map

Researched 2026-07-16 from Articulate's current docs. This is the master
checklist for building Halcyra to competitive parity, one slice at a time.
Statuses: ✅ done · 🟡 partial · ❌ missing · 🚫 out of scope for v1.

Articulate 360 is five products in one subscription: **Rise 360** (web block
editor — our v1 target), **Storyline 360** (desktop timeline editor — 🚫 per
project scope), **AI Assistant**, **Reach 360** (built-in LMS), **Review 360**
(stakeholder feedback), plus Content Library (stock/templates) and
Localization.

---

## 1. Rise 360 — block types

### Text blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Paragraph | ✅ | Rich text (bold/italic/links/lists) |
| Paragraph with heading/subheading | 🟡 | Compose heading + paragraph blocks manually |
| Heading / Subheading | ✅ | H2/H3 |
| Two column | ❌ | Layout container |
| Table | ❌ | |

### Statement / quote blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Statement (A–D styles) + Note | 🟡 | Callout (info/warning/tip) covers Note; no large statement styles |
| Quote (A–D, on image, carousel) | ❌ | |

### List blocks
| Articulate | Halcyra | Notes |
|---|---|---|
| Bulleted / Numbered | ✅ | |
| Checkbox list | ❌ | |

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
| Button / Button stack | ❌ | |
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

### Charts & dividers
| Articulate | Halcyra | Notes |
|---|---|---|
| Chart (bar/line/pie) | ❌ | |
| Divider | ✅ | |
| Continue button / Numbered divider / Spacer | ❌ | Continue gates progression |
| Block templates (save/reuse) | ❌ | |

## 2. Rise 360 — course-level features
| Feature | Halcyra | Notes |
|---|---|---|
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
| Share draft for review | 🟡 | Share link exists; no review mode |
| In-context comments/threads | ❌ | |
| Version history | ❌ | |

## 6. Other suite parts
- **Content Library 360** (stock photos/templates): ❌ — planned via Unsplash/Pexels APIs (do NOT copy Articulate's library).
- **Storyline 360**: 🚫 v1 (timeline editor explicitly out of scope).

---

## Build order (one slice per session)

1. **Blocks pack 1 — text & simple**: quote, statement styles, table, checkbox list, two-column, spacer/continue/numbered divider, button
2. **Blocks pack 2 — media**: audio, embed, attachment, gallery (carousel + grids), image style variants
3. **Quiz depth**: multiple response, fill-in-blank, matching; graded quiz lesson with pass mark, retries, shuffle; score → SCORM (`cmi.core.score`)
4. **Blocks pack 3 — interactive**: labeled graphic, process, timeline, sorting; flashcard images
5. **Course branding**: themes, accent color, fonts, cover page, navigation options, sections, duplicate course
6. **Design overhaul**: design system pass across editor/player/dashboard/auth (pairs with 5)
7. **AI expansion**: doc-to-course extraction, draft-all-lessons queue, tone/rewrite controls, summaries, TTS narration (Piper/Google free tier)
8. **Reach-lite**: learner accounts, enrollment, server-side progress/completion, basic reporting dashboard, certificates
9. **Review-lite**: comment threads on lessons, reviewer share mode
10. **Exports**: SCORM 2004 + xAPI, PDF export
11. **Localization**: DeepL/LibreTranslate pipeline, label sets, RTL
12. **Collaboration/scale** (post-revenue): co-editing, question banks, block templates, charts, scenario branching, undo/redo

Sources: [Rise lesson/block types](https://www.articulatesupport.com/article/Rise-Lesson-and-Block-Types) · [Articulate 360 suite](https://www.articulate.com/360/) · [AI Assistant features](https://www.articulatesupport.com/article/AI-Assistant-Storyline-360-and-Rise-360-Features) · [Reach 360 features](https://www.articulatesupport.com/article/Reach-360-All-Features) · [Rise theme/settings](https://www.articulatesupport.com/article/Rise-360-Personalize-the-Theme)
