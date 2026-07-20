import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { BlocksView } from "./BlockView";
import { QuizLessonRunner } from "./QuizLessonView";
import { groupBySection, themeStyleVars } from "./types";
import type { Block, QuizSettings, CourseTheme } from "./types";
import { getLabels, isRtl } from "./i18n";

// Data-agnostic course player. No Supabase / auth / network imports — the
// authoring app wraps it with a DB load, the SCORM standalone bundle wraps it
// with embedded JSON. Keep it that way.

export interface PlayerLesson {
  id: string;
  heading: string;
  blocks: Block[];
  quizSettings?: QuizSettings | null;
  section?: string;
}

export interface PlayerShellProps {
  courseTitle: string;
  courseDescription?: string | null;
  theme?: CourseTheme | null;
  locale?: string;
  lessons: PlayerLesson[];
  /** Resume support: lesson ids already completed (e.g. from localStorage). */
  initialCompletedIds?: string[];
  onExit?: () => void;
  onProgress?: (completed: number, total: number) => void;
  onCompletedIdsChange?: (ids: string[]) => void;
  onComplete?: () => void;
  /** Fires each time a graded quiz lesson is submitted (last submission wins for SCORM reporting). */
  onScore?: (lessonId: string, score: number, passed: boolean) => void;
}

export function PlayerShell({
  courseTitle,
  courseDescription,
  theme,
  locale,
  lessons,
  initialCompletedIds,
  onExit,
  onProgress,
  onCompletedIdsChange,
  onComplete,
  onScore,
}: PlayerShellProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialCompletedIds ?? []),
  );
  const [finished, setFinished] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [started, setStarted] = useState(() => !(theme?.coverImage || courseDescription));

  const navMode = theme?.navMode ?? "sidebar";
  const styleVars = themeStyleVars(theme) as CSSProperties;
  const t = getLabels(locale);
  const dir = isRtl(locale) ? "rtl" : "ltr";

  useEffect(() => {
    if (!overlayOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOverlayOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlayOpen]);

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

  if (!started) {
    return (
      <div className="player-cover-wrap" style={styleVars} dir={dir}>
        <div className={`player-cover cover-${theme?.coverLayout ?? "centered"}`}>
          {theme?.coverImage && theme.coverLayout !== "minimal" && (
            <img src={theme.coverImage} alt="" className="cover-image" />
          )}
          <div className="cover-text">
            <h1 className="cover-title">{courseTitle}</h1>
            {courseDescription && <p className="cover-description">{courseDescription}</p>}
            <button className="player-continue" onClick={() => setStarted(true)}>
              {t.startCourse}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lesson = lessons[currentIndex];

  const sidebar = (
    <>
      <div className="player-course-title">{courseTitle}</div>
      <div className="player-progress">
        <div className="player-progress-bar">
          <div className="player-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="player-progress-label">{progressPct}% {t.percentComplete}</span>
      </div>
      <nav>
        {(() => {
          let i = -1;
          return groupBySection(lessons).map((group, gi) => (
            <div className="player-nav-group" key={gi}>
              {group.section && <div className="player-nav-section">{group.section}</div>}
              {group.items.map((l) => {
                i++;
                const idx = i;
                return (
                  <button
                    key={l.id}
                    className={`player-nav-item ${idx === currentIndex && !finished ? "active" : ""}`}
                    onClick={() => {
                      setFinished(false);
                      setCurrentIndex(idx);
                      setOverlayOpen(false);
                    }}
                  >
                    <span className="player-nav-check">{completed.has(l.id) ? "✓" : idx + 1}</span>
                    <span>{l.heading || "Untitled lesson"}</span>
                  </button>
                );
              })}
            </div>
          ));
        })()}
      </nav>
      {onExit && (
        <button className="link player-exit" onClick={onExit}>
          {t.exitPreview}
        </button>
      )}
    </>
  );

  return (
    <div className={`player nav-${navMode}`} style={styleVars} dir={dir}>
      {navMode !== "compact" && (
        <aside
          className={`player-sidebar ${navMode === "overlay" ? `overlay-sidebar ${overlayOpen ? "open" : ""}` : ""}`}
        >
          {sidebar}
        </aside>
      )}
      {navMode === "overlay" && overlayOpen && (
        <div className="sidebar-backdrop" onClick={() => setOverlayOpen(false)} />
      )}

      <main className="player-main">
        {navMode !== "sidebar" && !finished && (
          <div className="player-topbar">
            {navMode === "overlay" && (
              <button className="hamburger" onClick={() => setOverlayOpen(true)} aria-label="Open lesson list">
                ☰
              </button>
            )}
            <div className="player-progress-inline">
              <div className="player-progress-bar">
                <div className="player-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="player-progress-label">{progressPct}%</span>
            </div>
          </div>
        )}
        {finished ? (
          <div className="player-finished">
            <h1>{t.courseComplete}</h1>
            <p>You finished “{courseTitle}”.</p>
            <button onClick={() => setFinished(false)}>{t.reviewLessons}</button>
          </div>
        ) : (
          <>
            <h1 className="view-lesson-heading">{lesson.heading}</h1>
            {lesson.quizSettings?.enabled ? (
              <>
                {currentIndex > 0 && (
                  <button
                    className="player-back quiz-back"
                    onClick={() => {
                      setCurrentIndex(currentIndex - 1);
                      window.scrollTo(0, 0);
                    }}
                  >
                    {t.previous}
                  </button>
                )}
                <QuizLessonRunner
                  key={lesson.id}
                  blocks={lesson.blocks}
                  settings={lesson.quizSettings}
                  labels={t}
                  onResult={(score, passed) => onScore?.(lesson.id, score, passed)}
                  onContinue={completeAndContinue}
                />
              </>
            ) : (
              <>
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
                      {t.previous}
                    </button>
                  )}
                  <button className="player-continue" onClick={completeAndContinue}>
                    {completed.has(lesson.id)
                      ? currentIndex < lessons.length - 1
                        ? t.continue
                        : t.finish
                      : currentIndex < lessons.length - 1
                        ? t.completeAndContinue
                        : t.completeAndFinish}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
