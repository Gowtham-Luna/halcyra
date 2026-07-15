import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { exportScormZip } from "./lib/scorm/export";
import type { Lesson } from "./types";

interface Props {
  courseId: string;
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
  onPreviewCourse: () => void;
}

export function CourseEditor({ courseId, onBack, onOpenLesson, onPreviewCourse }: Props) {
  const [title, setTitle] = useState("");
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [share, setShare] = useState<{ shareId: string; isPublic: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const removedIds = useRef<Set<string>>(new Set());
  const [persistedIds, setPersistedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase.from("courses").select("title, share_id, is_public").eq("id", courseId).single(),
        supabase
          .from("lessons")
          .select("id, heading, body, position")
          .eq("course_id", courseId)
          .order("position", { ascending: true }),
      ]);
      if (courseRes.error) setError(`Failed to load course: ${courseRes.error.message}`);
      else {
        setTitle(courseRes.data.title);
        setShare({ shareId: courseRes.data.share_id, isPublic: courseRes.data.is_public });
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

  async function save() {
    if (!lessons) return;
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const { error: courseError } = await supabase
        .from("courses")
        .update({ title, updated_at: now })
        .eq("id", courseId);
      if (courseError) throw new Error(courseError.message);

      const rows = lessons.map((l, i) => ({
        id: l.id,
        course_id: courseId,
        position: i,
        heading: l.heading,
        body: l.body,
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

  return (
    <div>
      <div className="lesson-toolbar">
        <button className="link back" onClick={onBack}>← All courses</button>
        <div className="toolbar-right">
          <button
            className="preview-toggle"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              setError(null);
              try {
                await exportScormZip(courseId);
              } catch (err) {
                setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? "Packaging…" : "⤓ Export SCORM 1.2"}
          </button>
          <button className="preview-toggle" onClick={onPreviewCourse}>▶ Preview course</button>
        </div>
      </div>

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

      {lessons !== null && (
        <div className="outline-editor">
          <input
            className="outline-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course title"
          />
          {lessons.map((lesson, i) => (
            <div className="block" key={lesson.id}>
              <div className="block-controls">
                <button onClick={() => moveLesson(i, -1)} disabled={i === 0} title="Move up">↑</button>
                <button onClick={() => moveLesson(i, 1)} disabled={i === lessons.length - 1} title="Move down">↓</button>
                <button onClick={() => deleteLesson(lesson.id)} title="Delete">✕</button>
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
              <input
                className="block-heading"
                value={lesson.heading}
                onChange={(e) => updateLesson(lesson.id, { heading: e.target.value })}
                placeholder="Lesson heading"
              />
              <textarea
                className="block-body"
                value={lesson.body}
                onChange={(e) => updateLesson(lesson.id, { body: e.target.value })}
                placeholder="What this lesson covers"
                rows={3}
              />
            </div>
          ))}
          <button className="add-block" onClick={addLesson}>+ Add lesson</button>

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
