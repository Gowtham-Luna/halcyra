import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { aiPost } from "./lib/api";
import type { CourseSummary } from "./types";

interface Props {
  onOpen: (courseId: string) => void;
}

export function Dashboard({ onOpen }: Props) {
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadCourses() {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, topic, updated_at")
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

  async function deleteCourse(course: CourseSummary) {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) setError(`Delete failed: ${error.message}`);
    else loadCourses();
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
                <span className="course-title">{c.title}</span>
                <span className="course-meta">
                  {c.topic} · updated {new Date(c.updated_at).toLocaleDateString()}
                </span>
              </button>
              <button className="course-delete" onClick={() => deleteCourse(c)} title="Delete course">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
