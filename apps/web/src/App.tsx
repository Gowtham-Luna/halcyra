import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { AuthForm } from "./AuthForm";
import { Dashboard } from "./Dashboard";
import { CourseEditor } from "./CourseEditor";
import { LessonEditor } from "./LessonEditor";
import { Player } from "./Player";
import { SharePlayer } from "./SharePlayer";
import "./App.css";

function getShareId(): string | null {
  const match = window.location.hash.match(/^#\/share\/([0-9a-fA-F-]{36})$/);
  return match ? match[1] : null;
}

type View =
  | { name: "dashboard" }
  | { name: "course"; courseId: string }
  | { name: "lesson"; courseId: string; lessonId: string }
  | { name: "player"; courseId: string };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [view, setView] = useState<View>({ name: "dashboard" });
  const [shareId, setShareId] = useState<string | null>(getShareId);

  useEffect(() => {
    const onHashChange = () => setShareId(getShareId());
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

  // Public share links bypass the auth gate entirely
  if (shareId) return <SharePlayer shareId={shareId} />;

  if (!sessionLoaded) return null;
  if (!session) return <AuthForm />;

  return (
    <div className="app">
      <header>
        <h1>Halcyra</h1>
        <div>
          <span className="user-email">{session.user.email}</span>
          <button className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>

      {view.name === "dashboard" ? (
        <Dashboard onOpen={(courseId) => setView({ name: "course", courseId })} />
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
      ) : (
        <LessonEditor
          lessonId={view.lessonId}
          onBack={() => setView({ name: "course", courseId: view.courseId })}
        />
      )}
    </div>
  );
}
