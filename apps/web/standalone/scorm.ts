// SCORM 1.2 SCO-side wrapper: discovers the LMS-provided API object and
// reports lesson status. Degrades to a no-op outside an LMS so the same
// bundle also works opened directly in a browser.

export interface Scorm12API {
  LMSInitialize(arg: string): string;
  LMSFinish(arg: string): string;
  LMSGetValue(element: string): string;
  LMSSetValue(element: string, value: string): string;
  LMSCommit(arg: string): string;
  LMSGetLastError(): string;
}

interface ApiWindow extends Window {
  API?: Scorm12API;
}

// Per the SCORM 1.2 spec: walk up the parent chain (max 500 hops per the
// reference algorithm; 25 is plenty in practice), then try the opener chain.
export function findApi(start: Window): Scorm12API | null {
  let win = start as ApiWindow;
  let hops = 0;
  while (!win.API && win.parent && win.parent !== win && hops < 25) {
    win = win.parent as ApiWindow;
    hops++;
  }
  if (win.API) return win.API;
  const opener = start.opener as ApiWindow | null;
  if (opener) {
    try {
      return findApi(opener);
    } catch {
      return null; // cross-origin opener
    }
  }
  return null;
}

export class ScormSession {
  private api: Scorm12API | null = null;
  private initialized = false;
  private finished = false;

  start(win: Window): boolean {
    this.api = findApi(win);
    if (!this.api) return false;
    this.initialized = this.api.LMSInitialize("") === "true";
    if (this.initialized) {
      const status = this.api.LMSGetValue("cmi.core.lesson_status");
      // "not attempted" -> mark in progress immediately
      if (status === "not attempted" || status === "") {
        this.api.LMSSetValue("cmi.core.lesson_status", "incomplete");
        this.api.LMSCommit("");
      }
    }
    return this.initialized;
  }

  reportProgress(completed: number, total: number): void {
    if (!this.initialized || this.finished || !this.api) return;
    // lesson_location is a free-text bookmark field; store simple progress
    this.api.LMSSetValue("cmi.core.lesson_location", `${completed}/${total}`);
    this.api.LMSCommit("");
  }

  reportComplete(): void {
    if (!this.initialized || this.finished || !this.api) return;
    this.api.LMSSetValue("cmi.core.lesson_status", "completed");
    this.api.LMSCommit("");
  }

  finish(): void {
    if (!this.initialized || this.finished || !this.api) return;
    this.finished = true;
    this.api.LMSFinish("");
  }
}
