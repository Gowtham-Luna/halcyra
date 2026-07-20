// SCORM SCO-side wrapper: discovers whichever LMS-provided API object is
// present — SCORM 1.2's window.API or SCORM 2004's window.API_1484_11 — and
// normalizes both behind one interface. This lets a single exported package
// (and a single player bundle) work correctly regardless of which SCORM
// version the LMS speaks; the imsmanifest.xml still declares the specific
// version the package was exported for. Degrades to a no-op outside an LMS.

export interface Scorm12API {
  LMSInitialize(arg: string): string;
  LMSFinish(arg: string): string;
  LMSGetValue(element: string): string;
  LMSSetValue(element: string, value: string): string;
  LMSCommit(arg: string): string;
  LMSGetLastError(): string;
}

export interface Scorm2004API {
  Initialize(arg: string): string;
  Terminate(arg: string): string;
  GetValue(element: string): string;
  SetValue(element: string, value: string): string;
  Commit(arg: string): string;
  GetLastError(): string;
}

interface ApiWindow extends Window {
  API?: Scorm12API;
  API_1484_11?: Scorm2004API;
}

// Per the SCORM spec: walk up the parent chain (max 500 hops per the
// reference algorithm; 25 is plenty in practice), then try the opener chain.
function findApiOnWindow<K extends "API" | "API_1484_11">(
  start: Window,
  key: K,
): ApiWindow[K] | null {
  let win = start as ApiWindow;
  let hops = 0;
  while (!win[key] && win.parent && win.parent !== win && hops < 25) {
    win = win.parent as ApiWindow;
    hops++;
  }
  if (win[key]) return win[key] as ApiWindow[K];
  const opener = start.opener as ApiWindow | null;
  if (opener) {
    try {
      return findApiOnWindow(opener, key);
    } catch {
      return null; // cross-origin opener
    }
  }
  return null;
}

export class ScormSession {
  private version: "1.2" | "2004" | null = null;
  private api12: Scorm12API | null = null;
  private api2004: Scorm2004API | null = null;
  private initialized = false;
  private finished = false;
  private scoreReported = false;

  /** Returns true if a SCORM API (either version) was found and initialized. */
  start(win: Window): boolean {
    const api2004 = findApiOnWindow(win, "API_1484_11");
    if (api2004) {
      this.version = "2004";
      this.api2004 = api2004;
      this.initialized = api2004.Initialize("") === "true";
      if (this.initialized) {
        const status = api2004.GetValue("cmi.completion_status");
        if (status === "not attempted" || status === "unknown" || status === "") {
          api2004.SetValue("cmi.completion_status", "incomplete");
          api2004.Commit("");
        }
      }
      return this.initialized;
    }
    const api12 = findApiOnWindow(win, "API");
    if (api12) {
      this.version = "1.2";
      this.api12 = api12;
      this.initialized = api12.LMSInitialize("") === "true";
      if (this.initialized) {
        const status = api12.LMSGetValue("cmi.core.lesson_status");
        if (status === "not attempted" || status === "") {
          api12.LMSSetValue("cmi.core.lesson_status", "incomplete");
          api12.LMSCommit("");
        }
      }
      return this.initialized;
    }
    return false;
  }

  reportProgress(completed: number, total: number): void {
    if (!this.initialized || this.finished) return;
    const bookmark = `${completed}/${total}`;
    if (this.version === "2004" && this.api2004) {
      this.api2004.SetValue("cmi.location", bookmark);
      this.api2004.Commit("");
    } else if (this.version === "1.2" && this.api12) {
      this.api12.LMSSetValue("cmi.core.lesson_location", bookmark);
      this.api12.LMSCommit("");
    }
  }

  reportComplete(): void {
    if (!this.initialized || this.finished) return;
    // A graded quiz's passed/failed status is more specific than "completed" — don't clobber it.
    if (this.scoreReported) return;
    if (this.version === "2004" && this.api2004) {
      this.api2004.SetValue("cmi.completion_status", "completed");
      this.api2004.Commit("");
    } else if (this.version === "1.2" && this.api12) {
      this.api12.LMSSetValue("cmi.core.lesson_status", "completed");
      this.api12.LMSCommit("");
    }
  }

  reportScore(score: number, passed: boolean): void {
    if (!this.initialized || this.finished) return;
    this.scoreReported = true;
    const raw = String(Math.round(score));
    if (this.version === "2004" && this.api2004) {
      this.api2004.SetValue("cmi.score.raw", raw);
      this.api2004.SetValue("cmi.score.min", "0");
      this.api2004.SetValue("cmi.score.max", "100");
      this.api2004.SetValue("cmi.score.scaled", (score / 100).toFixed(2));
      this.api2004.SetValue("cmi.completion_status", "completed");
      this.api2004.SetValue("cmi.success_status", passed ? "passed" : "failed");
      this.api2004.Commit("");
    } else if (this.version === "1.2" && this.api12) {
      this.api12.LMSSetValue("cmi.core.score.raw", raw);
      this.api12.LMSSetValue("cmi.core.score.min", "0");
      this.api12.LMSSetValue("cmi.core.score.max", "100");
      this.api12.LMSSetValue("cmi.core.lesson_status", passed ? "passed" : "failed");
      this.api12.LMSCommit("");
    }
  }

  finish(): void {
    if (!this.initialized || this.finished) return;
    this.finished = true;
    if (this.version === "2004" && this.api2004) this.api2004.Terminate("");
    else if (this.version === "1.2" && this.api12) this.api12.LMSFinish("");
  }
}
