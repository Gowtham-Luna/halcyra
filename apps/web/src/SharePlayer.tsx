import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { PlayerShell } from "./PlayerShell";
import type { PlayerLesson } from "./PlayerShell";

// Public delivery: plays a shared course for anonymous visitors via its
// share_id. No login required — RLS only exposes courses with is_public.
// Learner progress persists in localStorage (no accounts for learners yet).

interface Props {
  shareId: string;
}

export function SharePlayer({ shareId }: Props) {
  const [courseTitle, setCourseTitle] = useState("");
  const [lessons, setLessons] = useState<PlayerLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storageKey = `halcyra-progress-${shareId}`;

  useEffect(() => {
    async function load() {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title")
        .eq("share_id", shareId)
        .eq("is_public", true)
        .maybeSingle();
      if (courseError) {
        setError(`Failed to load course: ${courseError.message}`);
        return;
      }
      if (!course) {
        setError("This course link is invalid or sharing has been turned off.");
        return;
      }
      const { data: lessonRows, error: lessonsError } = await supabase
        .from("lessons")
        .select("id, heading, blocks")
        .eq("course_id", course.id)
        .order("position", { ascending: true });
      if (lessonsError) {
        setError(`Failed to load lessons: ${lessonsError.message}`);
        return;
      }
      setCourseTitle(course.title);
      setLessons(lessonRows as PlayerLesson[]);
    }
    load();
  }, [shareId]);

  if (error) return <p className="message error">{error}</p>;
  if (!lessons) return <p className="message">Loading course…</p>;

  let saved: string[] = [];
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  } catch {
    saved = [];
  }

  return (
    <div className="app">
      <header>
        <h1>Halcyra</h1>
      </header>
      <PlayerShell
        courseTitle={courseTitle}
        lessons={lessons}
        initialCompletedIds={saved}
        onCompletedIdsChange={(ids) => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(ids));
          } catch {
            // storage full/blocked — progress just won't persist
          }
        }}
      />
    </div>
  );
}
