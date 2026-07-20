import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "./lib/supabase";
import { BlocksView } from "./BlockView";
import { groupBySection, themeStyleVars } from "./types";
import type { Block, CourseTheme } from "./types";

interface Props {
  courseId: string;
  onClose: () => void;
}

interface PdfLesson {
  id: string;
  heading: string;
  blocks: Block[];
  section?: string;
}

// "PDF" export = a print-friendly full-course view + window.print() (same
// approach as the certificate in slice 8) rather than a PDF-generation
// dependency — keeps this lightweight since a real server-side PDF pipeline
// is a bigger lift than one print stylesheet buys back.
export function CoursePdfExport({ courseId, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<CourseTheme | null>(null);
  const [lessons, setLessons] = useState<PdfLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [courseRes, lessonsRes] = await Promise.all([
        supabase.from("courses").select("title, theme").eq("id", courseId).single(),
        supabase
          .from("lessons")
          .select("id, heading, blocks, section")
          .eq("course_id", courseId)
          .order("position", { ascending: true }),
      ]);
      if (courseRes.error) {
        setError(`Failed to load course: ${courseRes.error.message}`);
        return;
      }
      if (lessonsRes.error) {
        setError(`Failed to load lessons: ${lessonsRes.error.message}`);
        return;
      }
      setTitle(courseRes.data.title);
      setTheme(courseRes.data.theme);
      setLessons(lessonsRes.data);
    }
    load();
  }, [courseId]);

  if (error) return <p className="message error">{error}</p>;
  if (!lessons) return <p className="message">Loading course…</p>;

  return (
    <div className="pdf-export-page" style={themeStyleVars(theme) as CSSProperties}>
      <div className="pdf-export-controls no-print">
        <button className="link" onClick={onClose}>← Back to course</button>
        <button onClick={() => window.print()}>🖨 Print / Save as PDF</button>
      </div>

      <h1 className="view-lesson-heading">{title}</h1>

      {groupBySection(lessons).map((group, gi) => (
        <div key={gi}>
          {group.section && <h2 className="pdf-section-heading">{group.section}</h2>}
          {group.items.map((lesson) => (
            <section className="pdf-lesson" key={lesson.id}>
              <h2 className="view-heading">{lesson.heading || "Untitled lesson"}</h2>
              <BlocksView blocks={lesson.blocks} />
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
