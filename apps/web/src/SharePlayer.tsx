import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { PlayerShell } from "./PlayerShell";
import type { PlayerLesson } from "./PlayerShell";
import type { CourseTheme } from "./types";
import { AuthForm } from "./AuthForm";
import { Certificate } from "./Certificate";

// Public delivery: plays a shared course via its share_id. No login required
// — RLS only exposes courses with is_public, and anonymous progress persists
// in localStorage exactly as before. Signing in (optional) upgrades that to
// server-side enrollment + completion tracking (Reach-lite) and unlocks a
// certificate once the course is finished.

interface Props {
  shareId: string;
}

export function SharePlayer({ shareId }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState<string | null>(null);
  const [theme, setTheme] = useState<CourseTheme | null>(null);
  const [locale, setLocale] = useState("en");
  const [lessons, setLessons] = useState<PlayerLesson[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [serverCompletedIds, setServerCompletedIds] = useState<string[] | null>(null);
  const [enrollSynced, setEnrollSynced] = useState(false);
  const [courseComplete, setCourseComplete] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);

  const storageKey = `halcyra-progress-${shareId}`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function load() {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id, title, description, theme, locale")
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
        .select("id, heading, blocks, quiz_settings, section")
        .eq("course_id", course.id)
        .order("position", { ascending: true });
      if (lessonsError) {
        setError(`Failed to load lessons: ${lessonsError.message}`);
        return;
      }
      setCourseId(course.id);
      setCourseTitle(course.title);
      setCourseDescription(course.description);
      setTheme(course.theme);
      setLocale(course.locale ?? "en");
      setLessons(
        lessonRows.map((l) => ({
          id: l.id,
          heading: l.heading,
          blocks: l.blocks,
          quizSettings: l.quiz_settings,
          section: l.section,
        })),
      );
    }
    load();
  }, [shareId]);

  // Signed-in learner: self-enroll + pull existing server-side progress.
  useEffect(() => {
    if (!session || !courseId) return;
    let cancelled = false;
    async function syncEnrollment() {
      await supabase
        .from("enrollments")
        .upsert(
          { course_id: courseId, learner_id: session!.user.id, learner_email: session!.user.email ?? "" },
          { onConflict: "course_id,learner_id", ignoreDuplicates: true },
        );
      const { data } = await supabase
        .from("completions")
        .select("lesson_id")
        .eq("course_id", courseId)
        .eq("learner_id", session!.user.id);
      if (!cancelled) {
        setServerCompletedIds((data ?? []).map((r) => r.lesson_id));
        setEnrollSynced(true);
      }
    }
    syncEnrollment();
    return () => {
      cancelled = true;
    };
  }, [session, courseId]);

  if (error) return <p className="message error">{error}</p>;
  if (!sessionLoaded || !lessons || !courseId) return <p className="message">Loading course…</p>;
  if (session && !enrollSynced) return <p className="message">Loading your progress…</p>;

  let localSaved: string[] = [];
  try {
    localSaved = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
  } catch {
    localSaved = [];
  }

  if (showCertificate) {
    return (
      <Certificate
        courseTitle={courseTitle}
        defaultName={session?.user.email?.split("@")[0] ?? ""}
        onClose={() => setShowCertificate(false)}
      />
    );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header>
        <h1>Halcyra</h1>
        <div className="learner-auth-status">
          {session ? (
            <>
              <span className="user-email">{session.user.email}</span>
              <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
            </>
          ) : (
            <button className="link" onClick={() => setShowSignIn((s) => !s)}>
              {showSignIn ? "Cancel" : "Sign in to save progress"}
            </button>
          )}
        </div>
      </header>

      {!session && showSignIn && (
        <AuthForm
          compact
          heading="Sign in"
          tagline="Save your progress across devices and get a certificate when you finish."
        />
      )}

      {courseComplete && session && (
        <p className="message certificate-offer">
          🎓 Course complete!{" "}
          <button className="link" onClick={() => setShowCertificate(true)}>
            View your certificate
          </button>
        </p>
      )}

      <main id="main-content">
        <PlayerShell
          key={session ? `learner-${session.user.id}` : "anon"}
          courseTitle={courseTitle}
          courseDescription={courseDescription}
          theme={theme}
          locale={locale}
          lessons={lessons}
          initialCompletedIds={session ? (serverCompletedIds ?? []) : localSaved}
          onComplete={() => setCourseComplete(true)}
          onCompletedIdsChange={(ids) => {
            if (session && courseId) {
              const rows = ids.map((lessonId) => ({
                course_id: courseId,
                lesson_id: lessonId,
                learner_id: session.user.id,
              }));
              if (rows.length > 0) {
                supabase.from("completions").upsert(rows, { onConflict: "lesson_id,learner_id", ignoreDuplicates: true });
              }
              return;
            }
            try {
              localStorage.setItem(storageKey, JSON.stringify(ids));
            } catch {
              // storage full/blocked — progress just won't persist
            }
          }}
        />
      </main>
    </div>
  );
}
