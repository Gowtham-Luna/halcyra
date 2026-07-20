import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlayerShell } from "../src/PlayerShell";
import type { PlayerLesson } from "../src/PlayerShell";
import type { CourseTheme } from "../src/types";
import { ScormSession } from "./scorm";
import { XapiSession } from "./xapi";
import "../src/App.css";

// Standalone player: course data is injected by the exporter as
// data.js -> window.__COURSE_DATA__ (script tag added during export). The
// same bundle serves SCORM 1.2, SCORM 2004, and xAPI packages — it detects
// which reporting backend is available at runtime (SCORM API object, else
// xAPI launch query params, else a no-op for plain browser preview) rather
// than needing a separate build per format.

declare global {
  interface Window {
    __COURSE_DATA__?: {
      id: string;
      title: string;
      description?: string | null;
      theme?: CourseTheme | null;
      locale?: string;
      lessons: PlayerLesson[];
    };
  }
}

interface ReportingSession {
  reportProgress(completed: number, total: number): void;
  reportComplete(): void;
  reportScore(score: number, passed: boolean): void;
  finish(): void;
}

const noopSession: ReportingSession = {
  reportProgress() {},
  reportComplete() {},
  reportScore() {},
  finish() {},
};

const data = window.__COURSE_DATA__;

function selectSession(): ReportingSession {
  const scorm = new ScormSession();
  if (scorm.start(window)) return scorm;
  if (data) {
    const xapi = new XapiSession(`https://halcyra.app/course/${data.id}`, data.title);
    if (xapi.active) {
      xapi.start();
      return xapi;
    }
  }
  return noopSession;
}

const session = selectSession();
window.addEventListener("beforeunload", () => session.finish());

const root = createRoot(document.getElementById("root")!);

if (!data) {
  root.render(<p className="message error">Course data missing (data.js not loaded).</p>);
} else {
  root.render(
    <StrictMode>
      <PlayerShell
        courseTitle={data.title}
        courseDescription={data.description}
        theme={data.theme}
        locale={data.locale}
        lessons={data.lessons}
        onProgress={(completed, total) => session.reportProgress(completed, total)}
        onComplete={() => session.reportComplete()}
        onScore={(_lessonId, score, passed) => session.reportScore(score, passed)}
      />
    </StrictMode>,
  );
}
