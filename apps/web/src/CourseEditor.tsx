import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "./lib/supabase";
import { exportCourseZip } from "./lib/scorm/export";
import type { ExportFormat } from "./lib/scorm/manifest";
import { uploadImage } from "./lib/media";
import { aiPost } from "./lib/api";
import { CourseReports } from "./CourseReports";
import { CommentThread } from "./CommentThread";
import { CoursePdfExport } from "./CoursePdfExport";
import {
  DEFAULT_THEME,
  ACCENT_PRESETS,
  FONT_PAIRINGS,
  themeStyleVars,
  groupBySection,
} from "./types";
import type { Lesson, CourseTheme, Block } from "./types";

interface Props {
  courseId: string;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
  onPreviewCourse: () => void;
}

// Gemini free tier is shared across a user's requests and the API caps
// /api/ at 6 req/min — pace sequential draft-all calls well under that.
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const DRAFT_ALL_PACE_MS = 11_000;

export function CourseEditor({ courseId, onBack, onOpenLesson, onPreviewCourse }: Props) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState<CourseTheme>(DEFAULT_THEME);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showPdfExport, setShowPdfExport] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [share, setShare] = useState<{ shareId: string; isPublic: boolean } | null>(null);
  const [review, setReview] = useState<{ reviewId: string; reviewEnabled: boolean } | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reviewCopied, setReviewCopied] = useState(false);
  const removedIds = useRef<Set<string>>(new Set());
  const [persistedIds, setPersistedIds] = useState<Set<string>>(new Set());
  const coverFileInput = useRef<HTMLInputElement>(null);
  const [draftAllBusy, setDraftAllBusy] = useState(false);
  const [draftAllProgress, setDraftAllProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [orgId, setOrgId] = useState<string | null>(null);
  const [myOrgs, setMyOrgs] = useState<{ org_id: string; name: string }[]>([]);

  useEffect(() => {
    async function loadOrgs() {
      const { data } = await supabase.from("org_members").select("org_id, organizations(name)");
      if (data) {
        setMyOrgs(
          (data as unknown as { org_id: string; organizations: { name: string } | null }[]).map((r) => ({
            org_id: r.org_id,
            name: r.organizations?.name ?? "Untitled org",
          })),
        );
      }
    }
    loadOrgs();
  }, []);

  async function handleCoverFile(file: File) {
    setCoverUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      setTheme((t) => ({ ...t, coverImage: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCoverUploading(false);
    }
  }

  useEffect(() => {
    async function load() {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase
          .from("courses")
          .select("title, topic, description, theme, share_id, is_public, review_id, review_enabled, org_id")
          .eq("id", courseId)
          .single(),
        supabase
          .from("lessons")
          .select("id, heading, body, position, section")
          .eq("course_id", courseId)
          .order("position", { ascending: true }),
      ]);
      if (courseRes.error) setError(`Failed to load course: ${courseRes.error.message}`);
      else {
        setTitle(courseRes.data.title);
        setTopic(courseRes.data.topic ?? "");
        setDescription(courseRes.data.description ?? "");
        setTheme({ ...DEFAULT_THEME, ...(courseRes.data.theme ?? {}) });
        setShare({ shareId: courseRes.data.share_id, isPublic: courseRes.data.is_public });
        setReview({ reviewId: courseRes.data.review_id, reviewEnabled: courseRes.data.review_enabled });
        setOrgId(courseRes.data.org_id);
      }
      if (lessonsRes.error) setError(`Failed to load lessons: ${lessonsRes.error.message}`);
      else {
        setLessons(lessonsRes.data);
        setPersistedIds(new Set(lessonsRes.data.map((l) => l.id)));
      }
    }
    load();
  }, [courseId]);

  function updateLesson(id: string, patch: Partial<Lesson>) {
    setLessons((ls) => ls!.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function moveLesson(index: number, dir: -1 | 1) {
    setLessons((ls) => {
      const target = index + dir;
      if (target < 0 || target >= ls!.length) return ls;
      const next = [...ls!];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function deleteLesson(id: string) {
    removedIds.current.add(id);
    setLessons((ls) => ls!.filter((l) => l.id !== id));
  }

  function addLesson() {
    setLessons((ls) => [
      ...ls!,
      { id: crypto.randomUUID(), heading: "New lesson", body: "", position: ls!.length },
    ]);
  }

  async function duplicateLesson(id: string) {
    setDuplicatingId(id);
    setError(null);
    try {
      const { data: source, error: fetchError } = await supabase
        .from("lessons")
        .select("heading, body, blocks, quiz_settings, section")
        .eq("id", id)
        .single();
      if (fetchError) throw new Error(fetchError.message);

      const position = lessons!.length;
      const { data: inserted, error: insertError } = await supabase
        .from("lessons")
        .insert({
          course_id: courseId,
          position,
          heading: `${source.heading} (copy)`,
          body: source.body,
          blocks: source.blocks,
          quiz_settings: source.quiz_settings,
          section: source.section,
        })
        .select("id, heading, body, position, section")
        .single();
      if (insertError) throw new Error(insertError.message);

      setLessons((ls) => [...ls!, inserted]);
      setPersistedIds((ids) => new Set(ids).add(inserted.id));
    } catch (err) {
      setError(`Duplicate failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDuplicatingId(null);
    }
  }

  async function draftAllLessons() {
    if (!lessons) return;
    setError(null);

    const { data: blockRows, error: blockErr } = await supabase
      .from("lessons")
      .select("id, blocks")
      .eq("course_id", courseId);
    if (blockErr) {
      setError(`Draft all failed: ${blockErr.message}`);
      return;
    }
    const hasContent = new Set(
      (blockRows as { id: string; blocks: Block[] }[]).filter((r) => r.blocks.length > 0).map((r) => r.id),
    );
    const targets = lessons.filter((l) => persistedIds.has(l.id) && !hasContent.has(l.id));
    if (targets.length === 0) {
      setError("Nothing to draft — save new lessons first, or every lesson already has content.");
      return;
    }
    if (
      !window.confirm(
        `Draft ${targets.length} empty lesson${targets.length === 1 ? "" : "s"} with AI? This takes about ${Math.ceil((targets.length * DRAFT_ALL_PACE_MS) / 60000)} min (paced to stay under the AI rate limit).`,
      )
    )
      return;

    setDraftAllBusy(true);
    try {
      for (let i = 0; i < targets.length; i++) {
        setDraftAllProgress({ done: i, total: targets.length });
        const lesson = targets[i];
        const res = await aiPost<{ blocks: Block[] }>("/api/lesson-content", {
          courseTitle: title,
          topic,
          lessonHeading: lesson.heading,
          lessonBody: lesson.body,
        });
        const { error: updateErr } = await supabase
          .from("lessons")
          .update({ blocks: res.blocks, updated_at: new Date().toISOString() })
          .eq("id", lesson.id);
        if (updateErr) throw new Error(updateErr.message);
        if (i < targets.length - 1) await sleep(DRAFT_ALL_PACE_MS);
      }
      setDraftAllProgress({ done: targets.length, total: targets.length });
    } catch (err) {
      setError(`Draft all failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDraftAllBusy(false);
    }
  }

  async function save() {
    if (!lessons) return;
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { error: courseError } = await supabase
        .from("courses")
        .update({ title, description, theme, org_id: orgId, updated_at: now })
        .eq("id", courseId);
      if (courseError) throw new Error(courseError.message);

      const rows = lessons.map((l, i) => ({
        id: l.id,
        course_id: courseId,
        position: i,
        heading: l.heading,
        body: l.body,
        section: l.section || null,
        updated_at: now,
      }));
      const { error: upsertError } = await supabase.from("lessons").upsert(rows);
      if (upsertError) throw new Error(upsertError.message);
      setPersistedIds(new Set(rows.map((r) => r.id)));

      if (removedIds.current.size > 0) {
        const { error: deleteError } = await supabase
          .from("lessons")
          .delete()
          .in("id", [...removedIds.current]);
        if (deleteError) throw new Error(deleteError.message);
        removedIds.current.clear();
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setError(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  if (lessons === null && !error) return <p className="message">Loading…</p>;
  if (showPdfExport) return <CoursePdfExport courseId={courseId} onClose={() => setShowPdfExport(false)} />;

  async function runExport(format: ExportFormat) {
    setExporting(true);
    setError(null);
    try {
      await exportCourseZip(courseId, format);
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={themeStyleVars(theme) as CSSProperties}>
      <div className="lesson-toolbar">
        <button className="link back" onClick={onBack}>← All courses</button>
        <div className="toolbar-right">
          <select
            className="tone-select export-select"
            aria-label="Export course"
            disabled={exporting}
            value={0}
            onChange={(e) => {
              const value = e.target.value;
              e.target.value = "0";
              if (value === "pdf") setShowPdfExport(true);
              else if (value === "scorm12" || value === "scorm2004" || value === "xapi") runExport(value);
            }}
          >
            <option value={0}>{exporting ? "Packaging…" : "⤓ Export…"}</option>
            <option value="scorm12">SCORM 1.2</option>
            <option value="scorm2004">SCORM 2004</option>
            <option value="xapi">xAPI (Tin Can)</option>
            <option value="pdf">PDF (print)</option>
          </select>
          <button className="preview-toggle" onClick={onPreviewCourse}>▶ Preview course</button>
          <button className="preview-toggle" onClick={() => setReportsOpen((r) => !r)}>
            {reportsOpen ? "✕ Close reports" : "👥 Reports"}
          </button>
          <button className="preview-toggle" onClick={() => setCommentsOpen((c) => !c)}>
            {commentsOpen ? "✕ Close comments" : "💬 Comments"}
          </button>
        </div>
      </div>

      {reportsOpen && lessons !== null && <CourseReports courseId={courseId} totalLessons={lessons.length} />}

      {error && <p className="message error">{error}</p>}

      {share && (
        <div className="share-row">
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={share.isPublic}
              onChange={async (e) => {
                const isPublic = e.target.checked;
                const { error } = await supabase
                  .from("courses")
                  .update({ is_public: isPublic })
                  .eq("id", courseId);
                if (error) setError(`Sharing update failed: ${error.message}`);
                else setShare({ ...share, isPublic });
              }}
            />
            <span>Share with a public link</span>
          </label>
          {share.isPublic && (
            <div className="share-link">
              <code>{`${window.location.origin}${window.location.pathname}#/share/${share.shareId}`}</code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}${window.location.pathname}#/share/${share.shareId}`,
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}

      {review && (
        <div className="share-row">
          <label className="share-toggle">
            <input
              type="checkbox"
              checked={review.reviewEnabled}
              onChange={async (e) => {
                const reviewEnabled = e.target.checked;
                const { error } = await supabase
                  .from("courses")
                  .update({ review_enabled: reviewEnabled })
                  .eq("id", courseId);
                if (error) setError(`Review link update failed: ${error.message}`);
                else setReview({ ...review, reviewEnabled });
              }}
            />
            <span>Open a reviewer link (read-only + comments, no sign-in needed)</span>
          </label>
          {review.reviewEnabled && (
            <div className="share-link">
              <code>{`${window.location.origin}${window.location.pathname}#/review/${review.reviewId}`}</code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    `${window.location.origin}${window.location.pathname}#/review/${review.reviewId}`,
                  );
                  setReviewCopied(true);
                  setTimeout(() => setReviewCopied(false), 2000);
                }}
              >
                {reviewCopied ? "Copied ✓" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}

      {commentsOpen && lessons !== null && (
        <div className="comments-panel">
          <CommentThread courseId={courseId} lessonId={null} title="General comments" canModerate />
          {lessons.map((lesson) => (
            <CommentThread
              key={lesson.id}
              courseId={courseId}
              lessonId={lesson.id}
              title={`Comments on "${lesson.heading || "Untitled lesson"}"`}
              canModerate
            />
          ))}
        </div>
      )}

      {lessons !== null && (
        <div className="outline-editor">
          <input
            className="outline-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course title"
          />

          <div className="course-settings">
            <button className="link" onClick={() => setSettingsOpen((s) => !s)}>
              {settingsOpen ? "▾" : "▸"} Course settings (branding & cover page)
            </button>
            {settingsOpen && (
              <div className="theme-panel">
                {myOrgs.length > 0 && (
                  <label className="theme-field">
                    <span>Team (co-editors get access to this course)</span>
                    <select value={orgId ?? ""} onChange={(e) => setOrgId(e.target.value || null)}>
                      <option value="">Personal (just me)</option>
                      {myOrgs.map((org) => (
                        <option key={org.org_id} value={org.org_id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="theme-field">
                  <span>Description (shown on the cover page)</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="One or two sentences about this course"
                    rows={2}
                  />
                </label>

                <div className="theme-field">
                  <span>Accent color</span>
                  <div className="accent-swatches">
                    {ACCENT_PRESETS.map((c) => (
                      <button
                        key={c}
                        className={`accent-swatch ${theme.accentColor === c ? "selected" : ""}`}
                        style={{ background: c }}
                        onClick={() => setTheme((t) => ({ ...t, accentColor: c }))}
                        title={c}
                        aria-label={`Accent color ${c}`}
                        aria-pressed={theme.accentColor === c}
                      />
                    ))}
                    <input
                      type="color"
                      className="accent-custom"
                      value={theme.accentColor}
                      onChange={(e) => setTheme((t) => ({ ...t, accentColor: e.target.value }))}
                      title="Custom color"
                      aria-label="Custom accent color"
                    />
                  </div>
                </div>

                <label className="theme-field">
                  <span>Font pairing</span>
                  <select
                    value={theme.fontPairing}
                    onChange={(e) =>
                      setTheme((t) => ({ ...t, fontPairing: e.target.value as CourseTheme["fontPairing"] }))
                    }
                  >
                    {Object.entries(FONT_PAIRINGS).map(([key, f]) => (
                      <option key={key} value={key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="theme-field">
                  <span>Navigation style</span>
                  <select
                    value={theme.navMode}
                    onChange={(e) => setTheme((t) => ({ ...t, navMode: e.target.value as CourseTheme["navMode"] }))}
                  >
                    <option value="sidebar">Sidebar (always visible)</option>
                    <option value="compact">Compact (linear, no lesson list)</option>
                    <option value="overlay">Overlay (collapsible menu)</option>
                  </select>
                </label>

                <label className="theme-field">
                  <span>Cover layout</span>
                  <select
                    value={theme.coverLayout}
                    onChange={(e) =>
                      setTheme((t) => ({ ...t, coverLayout: e.target.value as CourseTheme["coverLayout"] }))
                    }
                  >
                    <option value="centered">Centered</option>
                    <option value="left">Image left</option>
                    <option value="minimal">Minimal (no image)</option>
                  </select>
                </label>

                <div className="theme-field">
                  <span>Cover image</span>
                  <div className="image-actions">
                    <input
                      ref={coverFileInput}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCoverFile(file);
                        e.target.value = "";
                      }}
                    />
                    <button onClick={() => coverFileInput.current?.click()} disabled={coverUploading}>
                      {coverUploading ? "Uploading…" : theme.coverImage ? "Replace image" : "Upload image"}
                    </button>
                    {theme.coverImage && (
                      <button onClick={() => setTheme((t) => ({ ...t, coverImage: undefined }))}>Remove</button>
                    )}
                  </div>
                  {theme.coverImage && (
                    <img src={theme.coverImage} alt="" className="image-preview cover-thumb" />
                  )}
                </div>
              </div>
            )}
          </div>

          {(() => {
            let i = -1;
            return groupBySection(lessons).map((group, gi) => (
              <div className="outline-section-group" key={gi}>
                {group.section && <h3 className="outline-section-heading">{group.section}</h3>}
                {group.items.map((lesson) => {
                  i++;
                  const idx = i;
                  return (
                    <div className="block" key={lesson.id}>
                      <div className="block-controls">
                        <button
                          onClick={() => moveLesson(idx, -1)}
                          disabled={idx === 0}
                          title="Move up"
                          aria-label="Move lesson up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveLesson(idx, 1)}
                          disabled={idx === lessons.length - 1}
                          title="Move down"
                          aria-label="Move lesson down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => duplicateLesson(lesson.id)}
                          disabled={duplicatingId !== null || !persistedIds.has(lesson.id)}
                          title="Duplicate lesson"
                          aria-label="Duplicate lesson"
                        >
                          {duplicatingId === lesson.id ? "…" : "⎘"}
                        </button>
                        <button onClick={() => deleteLesson(lesson.id)} title="Delete" aria-label="Delete lesson">
                          ✕
                        </button>
                        <button
                          className="edit-content"
                          onClick={() => onOpenLesson(lesson.id)}
                          disabled={!persistedIds.has(lesson.id)}
                          title={
                            persistedIds.has(lesson.id)
                              ? "Edit lesson content blocks"
                              : "Save the course first to edit content"
                          }
                        >
                          Edit content →
                        </button>
                      </div>
                      <div className="lesson-outline-fields">
                        <input
                          className="block-heading"
                          value={lesson.heading}
                          onChange={(e) => updateLesson(lesson.id, { heading: e.target.value })}
                          placeholder="Lesson heading"
                        />
                        <input
                          className="section-input"
                          value={lesson.section ?? ""}
                          onChange={(e) => updateLesson(lesson.id, { section: e.target.value })}
                          placeholder="Section (optional)"
                        />
                      </div>
                      <textarea
                        className="block-body"
                        value={lesson.body}
                        onChange={(e) => updateLesson(lesson.id, { body: e.target.value })}
                        placeholder="What this lesson covers"
                        rows={3}
                      />
                    </div>
                  );
                })}
              </div>
            ));
          })()}
          <button className="add-block" onClick={addLesson}>+ Add lesson</button>

          <div className="ai-toolbar">
            <button onClick={draftAllLessons} disabled={draftAllBusy}>
              {draftAllBusy
                ? draftAllProgress
                  ? `Drafting ${draftAllProgress.done + 1}/${draftAllProgress.total}…`
                  : "Checking lessons…"
                : "✨ Draft all empty lessons with AI"}
            </button>
          </div>

          <div className="save-row">
            <button onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
            {savedAt && <span className="saved-note">Saved at {savedAt}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
