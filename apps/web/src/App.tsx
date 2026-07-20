import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { AuthForm } from "./AuthForm";
import { LandingPage } from "./LandingPage";
import { Dashboard } from "./Dashboard";
import { CourseEditor } from "./CourseEditor";
import { LessonEditor } from "./LessonEditor";
import { Player } from "./Player";
import { SharePlayer } from "./SharePlayer";
import { ReviewPlayer } from "./ReviewPlayer";
import { Orgs } from "./Orgs";
import "./App.css";

function getShareId(): string | null {
  const match = window.location.hash.match(/^#\/share\/([0-9a-fA-F-]{36})$/);
  return match ? match[1] : null;
}

function getReviewId(): string | null {
  const match = window.location.hash.match(/^#\/review\/([0-9a-fA-F-]{36})$/);
  return match ? match[1] : null;
}

type View =
  | { name: "dashboard" }
  | { name: "course"; courseId: string }
  | { name: "lesson"; courseId: string; lessonId: string }
  | { name: "player"; courseId: string }
  | { name: "orgs" };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [view, setView] = useState<View>({ name: "dashboard" });
  const [shareId, setShareId] = useState<string | null>(getShareId);
  const [reviewId, setReviewId] = useState<string | null>(getReviewId);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setShareId(getShareId());
      setReviewId(getReviewId());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) setView({ name: "dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Claim any org invites sent to this email — idempotent, safe to run every
  // time the session changes (a no-op once already claimed).
  useEffect(() => {
    if (!session?.user.email) return;
    supabase
      .from("org_members")
      .update({ user_id: session.user.id, joined_at: new Date().toISOString() })
      .eq("invited_email", session.user.email)
      .is("user_id", null)
      .then(() => {});
  }, [session?.user.id, session?.user.email]);

  // Public share/review links bypass the auth gate entirely
  if (shareId) return <SharePlayer shareId={shareId} />;
  if (reviewId) return <ReviewPlayer reviewId={reviewId} />;

  if (!sessionLoaded) return null;
  if (!session) {
    return showAuth ? (
      <AuthForm onBack={() => setShowAuth(false)} />
    ) : (
      <LandingPage onGetStarted={() => setShowAuth(true)} />
    );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="app-header">
        <h1>Halcyra</h1>
        <div>
          <button className="link" onClick={() => setView({ name: "orgs" })}>🏢 Teams</button>
          <span className="user-email">{session.user.email}</span>
          <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>

      <main id="main-content">
        {view.name === "dashboard" ? (
          <Dashboard onOpen={(courseId) => setView({ name: "course", courseId })} />
        ) : view.name === "orgs" ? (
          <Orgs
            userId={session.user.id}
            userEmail={session.user.email ?? ""}
            onBack={() => setView({ name: "dashboard" })}
          />
        ) : view.name === "course" ? (
          <CourseEditor
            courseId={view.courseId}
            onBack={() => setView({ name: "dashboard" })}
            onOpenLesson={(lessonId) =>
              setView({ name: "lesson", courseId: view.courseId, lessonId })
            }
            onPreviewCourse={() => setView({ name: "player", courseId: view.courseId })}
          />
        ) : view.name === "player" ? (
          <Player
            courseId={view.courseId}
            onExit={() => setView({ name: "course", courseId: view.courseId })}
          />
        ) : view.name === "lesson" ? (
          <LessonEditor
            lessonId={view.lessonId}
            onBack={() => setView({ name: "course", courseId: view.courseId })}
          />
        ) : null}
      </main>
    </div>
  );
}
