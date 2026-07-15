import { useMemo, useState } from "react";
import { BlocksView } from "./BlockView";
import type { Block } from "./types";

// Data-agnostic course player. No Supabase / auth / network imports — the
// authoring app wraps it with a DB load, the SCORM standalone bundle wraps it
// with embedded JSON. Keep it that way.

export interface PlayerLesson {
  id: string;
  heading: string;
  blocks: Block[];
}

export interface PlayerShellProps {
  courseTitle: string;
  lessons: PlayerLesson[];
  /** Resume support: lesson ids already completed (e.g. from localStorage). */
  initialCompletedIds?: string[];
  onExit?: () => void;
  onProgress?: (completed: number, total: number) => void;
  onCompletedIdsChange?: (ids: string[]) => void;
  onComplete?: () => void;
}

export function PlayerShell({
  courseTitle,
  lessons,
  initialCompletedIds,
  onExit,
  onProgress,
  onCompletedIdsChange,
  onComplete,
}: PlayerShellProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompletedIds ?? []),
  );
  const [finished, setFinished] = useState(false);

  const progressPct = useMemo(
    () => (lessons.length > 0 ? Math.round((completed.size / lessons.length) * 100) : 0),
    [completed, lessons],
  );

  if (lessons.length === 0) {
    return <p className="message">This course has no lessons yet.</p>;
  }

  function completeAndContinue() {
    const lesson = lessons[currentIndex];
    const next = new Set(completed);
    next.add(lesson.id);
    setCompleted(next);
    onProgress?.(next.size, lessons.length);
    onCompletedIdsChange?.([...next]);
    if (next.size === lessons.length) {
      setFinished(true);
      onComplete?.();
    } else if (currentIndex < lessons.length - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo(0, 0);
    }
  }

  const lesson = lessons[currentIndex];

  return (
    <div className="player">
      <aside className="player-sidebar">
        <div className="player-course-title">{courseTitle}</div>
        <div className="player-progress">
          <div className="player-progress-bar">
            <div className="player-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="player-progress-label">{progressPct}% complete</span>
        </div>
        <nav>
          {lessons.map((l, i) => (
            <button
              key={l.id}
              className={`player-nav-item ${i === currentIndex && !finished ? "active" : ""}`}
              onClick={() => {
                setFinished(false);
                setCurrentIndex(i);
              }}
            >
              <span className="player-nav-check">{completed.has(l.id) ? "✓" : i + 1}</span>
              <span>{l.heading || "Untitled lesson"}</span>
            </button>
          ))}
        </nav>
        {onExit && (
          <button className="link player-exit" onClick={onExit}>
            ← Exit preview
          </button>
        )}
      </aside>

      <main className="player-main">
        {finished ? (
          <div className="player-finished">
            <h1>🎉 Course complete</h1>
            <p>You finished “{courseTitle}”.</p>
            <button onClick={() => setFinished(false)}>Review lessons</button>
          </div>
        ) : (
          <>
            <h1 className="view-lesson-heading">{lesson.heading}</h1>
            <BlocksView blocks={lesson.blocks} />
            <div className="player-footer">
              {currentIndex > 0 && (
                <button
                  className="player-back"
                  onClick={() => {
                    setCurrentIndex(currentIndex - 1);
                    window.scrollTo(0, 0);
                  }}
                >
                  ← Previous
                </button>
              )}
              <button className="player-continue" onClick={completeAndContinue}>
                {completed.has(lesson.id)
                  ? currentIndex < lessons.length - 1
                    ? "Continue →"
                    : "Finish"
                  : currentIndex < lessons.length - 1
                    ? "Complete & continue →"
                    : "Complete & finish"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
