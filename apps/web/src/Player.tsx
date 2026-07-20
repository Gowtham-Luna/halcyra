import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { PlayerShell } from "./PlayerShell";
import type { PlayerLesson } from "./PlayerShell";
import type { CourseTheme } from "./types";

// App-side wrapper: loads the course from Supabase, hands it to PlayerShell.

interface Props {
  courseId: string;
  onExit: () => void;
}

export function Player({ courseId, onExit }: Props) {
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState<string | null>(null);
  const [theme, setTheme] = useState<CourseTheme | null>(null);
  const [locale, setLocale] = useState("en");
  const [lessons, setLessons] = useState<PlayerLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase.from("courses").select("title, description, theme, locale").eq("id", courseId).single(),
        supabase
          .from("lessons")
          .select("id, heading, blocks, quiz_settings, section")
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
      setCourseDescription(courseRes.data.description);
      setTheme(courseRes.data.theme);
      setLocale(courseRes.data.locale ?? "en");
      setLessons(
        lessonsRes.data.map((l) => ({
          id: l.id,
          heading: l.heading,
          blocks: l.blocks,
          quizSettings: l.quiz_settings,
          section: l.section,
        })),
      );
    }
    load();
  }, [courseId]);

  if (error) return <p className="message error">{error}</p>;
  if (!lessons) return <p className="message">Loading course…</p>;

  return (
    <PlayerShell
      courseTitle={courseTitle}
      courseDescription={courseDescription}
      theme={theme}
      locale={locale}
      lessons={lessons}
      onExit={onExit}
    />
  );
}
