import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { aiPost } from "./lib/api";
import { collectStrings, applyTranslatedStrings } from "./types";
import type { CourseSummary, Block } from "./types";
import { LANGUAGE_OPTIONS } from "./i18n";

interface Props {
  onOpen: (courseId: string) => void;
}

const DOC_ACCEPT = ".pdf,.docx,.txt";
const DOC_MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};
const MAX_DOC_BYTES = 8 * 1024 * 1024;

// Gemini/DeepL both sit behind the same /api/ 6-req/min limiter — pace
// sequential per-lesson translation calls well under that (same approach as
// CourseEditor's "draft all lessons").
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const TRANSLATE_PACE_MS = 11_000;
const TRANSLATE_CHUNK = 40;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function Dashboard({ onOpen }: Props) {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateProgress, setTranslateProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const docFileInput = useRef<HTMLInputElement>(null);

  async function translateNonEmpty(texts: string[], targetLang: string): Promise<string[]> {
    const indexes: number[] = [];
    const nonEmpty: string[] = [];
    texts.forEach((s, i) => {
      if (s && s.trim()) {
        indexes.push(i);
        nonEmpty.push(s);
      }
    });
    const result = [...texts];
    for (let start = 0; start < nonEmpty.length; start += TRANSLATE_CHUNK) {
      const chunk = nonEmpty.slice(start, start + TRANSLATE_CHUNK);
      const { texts: translatedChunk } = await aiPost<{ texts: string[] }>("/api/translate", {
        texts: chunk,
        targetLang,
      });
      translatedChunk.forEach((t, ci) => {
        result[indexes[start + ci]] = t;
      });
      if (start + TRANSLATE_CHUNK < nonEmpty.length) await sleep(TRANSLATE_PACE_MS);
    }
    return result;
  }

  async function loadCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, topic, updated_at, theme")
      .order("updated_at", { ascending: false });
    if (error) setError(`Failed to load courses: ${error.message}`);
    else setCourses(data);
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function createCourse() {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const json = await aiPost<{ title: string; blocks: { heading: string; body: string }[] }>(
        "/api/outline",
        { topic: trimmed },
      );

      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({ title: json.title, topic: trimmed })
        .select("id")
        .single();
      if (courseError) throw new Error(courseError.message);

      const lessons = (json.blocks as { heading: string; body: string }[]).map(
        (b, i) => ({
          course_id: course.id,
          position: i,
          heading: b.heading,
          body: b.body,
        }),
      );
      const { error: lessonsError } = await supabase.from("lessons").insert(lessons);
      if (lessonsError) throw new Error(lessonsError.message);

      setTopic("");
      onOpen(course.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function createCourseFromDocument(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = DOC_MIME_TYPES[ext];
    if (!mimeType) {
      setError("Unsupported file type — use PDF, DOCX, or TXT");
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      setError("File is too large (max 8MB)");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const json = await aiPost<{ title: string; blocks: { heading: string; body: string }[] }>(
        "/api/doc-outline",
        { fileBase64, mimeType },
      );

      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({ title: json.title, topic: file.name })
        .select("id")
        .single();
      if (courseError) throw new Error(courseError.message);

      const lessons = json.blocks.map((b, i) => ({
        course_id: course.id,
        position: i,
        heading: b.heading,
        body: b.body,
      }));
      const { error: lessonsError } = await supabase.from("lessons").insert(lessons);
      if (lessonsError) throw new Error(lessonsError.message);

      onOpen(course.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  async function deleteCourse(course: CourseSummary) {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) setError(`Delete failed: ${error.message}`);
    else loadCourses();
  }

  async function duplicateCourse(course: CourseSummary) {
    setDuplicatingId(course.id);
    setError(null);
    try {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase
          .from("courses")
          .select("title, topic, description, theme")
          .eq("id", course.id)
          .single(),
        supabase
          .from("lessons")
          .select("heading, body, position, blocks, quiz_settings, section")
          .eq("course_id", course.id)
          .order("position", { ascending: true }),
      ]);
      if (courseRes.error) throw new Error(courseRes.error.message);
      if (lessonsRes.error) throw new Error(lessonsRes.error.message);

      const { data: newCourse, error: insertCourseError } = await supabase
        .from("courses")
        .insert({
          title: `${courseRes.data.title} (copy)`,
          topic: courseRes.data.topic,
          description: courseRes.data.description,
          theme: courseRes.data.theme,
        })
        .select("id")
        .single();
      if (insertCourseError) throw new Error(insertCourseError.message);

      if (lessonsRes.data.length > 0) {
        const rows = lessonsRes.data.map((l) => ({
          course_id: newCourse.id,
          position: l.position,
          heading: l.heading,
          body: l.body,
          blocks: l.blocks,
          quiz_settings: l.quiz_settings,
          section: l.section,
        }));
        const { error: insertLessonsError } = await supabase.from("lessons").insert(rows);
        if (insertLessonsError) throw new Error(insertLessonsError.message);
      }

      await loadCourses();
    } catch (err) {
      setError(`Duplicate failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDuplicatingId(null);
    }
  }

  async function translateCourse(course: CourseSummary, locale: string, deeplTarget: string) {
    setTranslatingId(course.id);
    setTranslateProgress(null);
    setError(null);
    try {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase
          .from("courses")
          .select("title, topic, description, theme")
          .eq("id", course.id)
          .single(),
        supabase
          .from("lessons")
          .select("heading, body, position, blocks, quiz_settings, section")
          .eq("course_id", course.id)
          .order("position", { ascending: true }),
      ]);
      if (courseRes.error) throw new Error(courseRes.error.message);
      if (lessonsRes.error) throw new Error(lessonsRes.error.message);

      const [translatedTitle, translatedDescription] = await translateNonEmpty(
        [courseRes.data.title, courseRes.data.description ?? ""],
        deeplTarget,
      );

      const { data: newCourse, error: insertCourseError } = await supabase
        .from("courses")
        .insert({
          title: translatedTitle,
          topic: courseRes.data.topic,
          description: translatedDescription || null,
          theme: courseRes.data.theme,
          locale,
        })
        .select("id")
        .single();
      if (insertCourseError) throw new Error(insertCourseError.message);

      const lessons = lessonsRes.data;
      for (let i = 0; i < lessons.length; i++) {
        setTranslateProgress({ done: i, total: lessons.length });
        const lesson = lessons[i];
        const blocks = lesson.blocks as Block[];
        const collected = collectStrings(blocks);
        const combined = await translateNonEmpty([lesson.heading, lesson.body, ...collected], deeplTarget);
        const [translatedHeading, translatedBody, ...translatedBlockStrings] = combined;
        const translatedBlocks = applyTranslatedStrings(blocks, translatedBlockStrings);

        const { error: insertLessonError } = await supabase.from("lessons").insert({
          course_id: newCourse.id,
          position: lesson.position,
          heading: translatedHeading,
          body: translatedBody,
          blocks: translatedBlocks,
          quiz_settings: lesson.quiz_settings,
          section: lesson.section,
        });
        if (insertLessonError) throw new Error(insertLessonError.message);

        if (i < lessons.length - 1) await sleep(TRANSLATE_PACE_MS);
      }

      await loadCourses();
      onOpen(newCourse.id);
    } catch (err) {
      setError(`Translate failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTranslatingId(null);
      setTranslateProgress(null);
    }
  }

  return (
    <div>
      <div className="generate-row">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="New course topic, e.g. Workplace fire safety basics"
          maxLength={300}
          onKeyDown={(e) => e.key === "Enter" && createCourse()}
        />
        <button onClick={createCourse} disabled={busy || !topic.trim()}>
          {busy ? "Generating…" : "Generate Course"}
        </button>
      </div>

      <div className="generate-row">
        <input
          ref={docFileInput}
          type="file"
          accept={DOC_ACCEPT}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) createCourseFromDocument(file);
            e.target.value = "";
          }}
        />
        <button onClick={() => docFileInput.current?.click()} disabled={importing}>
          {importing ? "Importing…" : "✨ Import course from a document (PDF/DOCX/TXT)"}
        </button>
      </div>

      {error && <p className="message error">{error}</p>}

      {courses === null ? (
        <p className="message">Loading courses…</p>
      ) : courses.length === 0 ? (
        <p className="message">No courses yet — generate your first one above.</p>
      ) : (
        <ul className="course-list">
          {courses.map((c) => (
            <li key={c.id} className="course-item">
              <button className="course-open" onClick={() => onOpen(c.id)}>
                <span
                  className="course-accent-dot"
                  style={{ background: c.theme?.accentColor || "#6c5ce7" }}
                  aria-hidden="true"
                />
                <span className="course-title">{c.title}</span>
                <span className="course-meta">
                  {c.topic} · updated {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </button>
              <select
                className="tone-select"
                aria-label={`Translate ${c.title}`}
                disabled={translatingId !== null}
                value={0}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  e.target.value = "0";
                  if (idx > 0) {
                    const lang = LANGUAGE_OPTIONS[idx - 1];
                    translateCourse(c, lang.code, lang.deeplTarget);
                  }
                }}
              >
                <option value={0}>
                  {translatingId === c.id
                    ? translateProgress
                      ? `Translating ${translateProgress.done + 1}/${translateProgress.total}…`
                      : "Translating…"
                    : "🌐 Translate…"}
                </option>
                {LANGUAGE_OPTIONS.map((lang, i) => (
                  <option key={lang.code} value={i + 1}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <button
                className="course-duplicate"
                onClick={() => duplicateCourse(c)}
                disabled={duplicatingId !== null}
                title="Duplicate course"
                aria-label={`Duplicate ${c.title}`}
              >
                {duplicatingId === c.id ? "…" : "⎘"}
              </button>
              <button
                className="course-delete"
                onClick={() => deleteCourse(c)}
                title="Delete course"
                aria-label={`Delete ${c.title}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
