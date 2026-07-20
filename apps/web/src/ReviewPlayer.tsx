import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "./lib/supabase";
import { BlocksView } from "./BlockView";
import { CommentThread } from "./CommentThread";
import { themeStyleVars } from "./types";
import type { Block, CourseTheme } from "./types";
import { isRtl } from "./i18n";

interface Props {
  reviewId: string;
}

interface ReviewLesson {
  id: string;
  heading: string;
  blocks: Block[];
}

const REVIEWER_NAME_KEY = "halcyra-reviewer-name";

// Reviewer share mode: a distinct link from the learner share link (Review
// 360-lite). Read-only content walkthrough + comment threads per lesson and
// one general/course-level thread — no progress tracking, no quiz-taking.
export function ReviewPlayer({ reviewId }: Props) {
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [theme, setTheme] = useState<CourseTheme | null>(null);
  const [locale, setLocale] = useState("en");
  const [lessons, setLessons] = useState<ReviewLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewerName, setReviewerName] = useState(
    () => localStorage.getItem(REVIEWER_NAME_KEY) ?? "",
  );

  useEffect(() => {
    async function load() {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title, theme, locale")
        .eq("review_id", reviewId)
        .eq("review_enabled", true)
        .maybeSingle();
      if (courseError) {
        setError(`Failed to load course: ${courseError.message}`);
        return;
      }
      if (!course) {
        setError("This review link is invalid or review mode has been turned off.");
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
      setCourseId(course.id);
      setCourseTitle(course.title);
      setTheme(course.theme);
      setLocale(course.locale ?? "en");
      setLessons(lessonRows);
    }
    load();
  }, [reviewId]);

  if (error) return <p className="message error">{error}</p>;
  if (!lessons || !courseId) return <p className="message">Loading course…</p>;

  return (
    <div className="app review-app" style={themeStyleVars(theme) as CSSProperties} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header>
        <h1>Halcyra</h1>
        <span className="review-badge">Review mode</span>
      </header>

      <main id="main-content">
        <h1 className="view-lesson-heading">{courseTitle}</h1>

        <label className="reviewer-name-field">
          Your name (shown on your comments)
          <input
            value={reviewerName}
            onChange={(e) => {
              setReviewerName(e.target.value);
              try {
                localStorage.setItem(REVIEWER_NAME_KEY, e.target.value);
              } catch {
                // storage full/blocked — name just won't be remembered next visit
              }
            }}
            placeholder="Jane Reviewer"
          />
        </label>

        <CommentThread
          courseId={courseId}
          lessonId={null}
          title="General comments"
          canModerate={false}
          reviewerName={reviewerName}
        />

        {lessons.length === 0 && <p className="message">This course has no lessons yet.</p>}

        {lessons.map((lesson) => (
          <section className="review-lesson" key={lesson.id}>
            <h2 className="view-heading">{lesson.heading || "Untitled lesson"}</h2>
            <BlocksView blocks={lesson.blocks} />
            <CommentThread
              courseId={courseId}
              lessonId={lesson.id}
              title={`Comments on "${lesson.heading || "Untitled lesson"}"`}
              canModerate={false}
              reviewerName={reviewerName}
            />
          </section>
        ))}
      </main>
    </div>
  );
}
