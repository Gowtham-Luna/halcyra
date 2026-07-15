import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlayerShell } from "../src/PlayerShell";
import type { PlayerLesson } from "../src/PlayerShell";
import { ScormSession } from "./scorm";
import "../src/App.css";

// Standalone SCORM player: course data is injected by the exporter as
// data.js -> window.__COURSE_DATA__ (script tag added during export).

declare global {
  interface Window {
    __COURSE_DATA__?: { title: string; lessons: PlayerLesson[] };
  }
}

const data = window.__COURSE_DATA__;
const scorm = new ScormSession();
scorm.start(window);
window.addEventListener("beforeunload", () => scorm.finish());

const root = createRoot(document.getElementById("root")!);

if (!data) {
  root.render(<p className="message error">Course data missing (data.js not loaded).</p>);
} else {
  root.render(
    <StrictMode>
      <PlayerShell
        courseTitle={data.title}
        lessons={data.lessons}
        onProgress={(completed, total) => scorm.reportProgress(completed, total)}
        onComplete={() => scorm.reportComplete()}
      />
    </StrictMode>,
  );
}
