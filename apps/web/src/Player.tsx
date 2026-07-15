import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { PlayerShell } from "./PlayerShell";
import type { PlayerLesson } from "./PlayerShell";

// App-side wrapper: loads the course from Supabase, hands it to PlayerShell.

interface Props {
  courseId: string;
  onExit: () => void;
}

export function Player({ courseId, onExit }: Props) {
  const [courseTitle, setCourseTitle] = useState("");
  const [lessons, setLessons] = useState<PlayerLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase.from("courses").select("title").eq("id", courseId).single(),
        supabase
          .from("lessons")
          .select("id, heading, blocks")
          .eq("course_id", courseId)
          .order("position", { ascending: true }),
      ]);
      if (courseRes.error || lessonsRes.error) {
        setError(
          `Failed to load course: ${courseRes.error?.message ?? lessonsRes.error?.message}`,
        );
        return;
      }
      setCourseTitle(courseRes.data.title);
      setLessons(lessonsRes.data as PlayerLesson[]);
    }
    load();
  }, [courseId]);

  if (error) return <p className="message error">{error}</p>;
  if (!lessons) return <p className="message">Loading course…</p>;

  return <PlayerShell courseTitle={courseTitle} lessons={lessons} onExit={onExit} />;
}
