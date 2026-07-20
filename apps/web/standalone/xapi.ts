// xAPI (Tin Can) launch-side client. Unlike SCORM there's no window API
// object — the LRS endpoint/auth/actor arrive as launch query-string params
// per the community "xAPI Launch" convention (the same one most LMSs use to
// launch xAPI content: ?endpoint=...&auth=...&actor=...). Statements are
// best-effort: an unreachable or misconfigured LRS shouldn't break the
// learner's course.

interface LaunchParams {
  endpoint: string;
  auth: string;
  actor: string;
  registration?: string;
}

function parseLaunchParams(search: string): LaunchParams | null {
  const params = new URLSearchParams(search);
  const endpoint = params.get("endpoint");
  const auth = params.get("auth");
  const actor = params.get("actor");
  if (!endpoint || !auth || !actor) return null;
  return {
    endpoint: endpoint.endsWith("/") ? endpoint : `${endpoint}/`,
    auth,
    actor,
    registration: params.get("registration") ?? undefined,
  };
}

interface Verb {
  id: string;
  display: string;
}

const VERBS = {
  launched: { id: "http://adlnet.gov/expapi/verbs/launched", display: "launched" },
  completed: { id: "http://adlnet.gov/expapi/verbs/completed", display: "completed" },
  scored: { id: "http://adlnet.gov/expapi/verbs/scored", display: "scored" },
  terminated: { id: "http://adlnet.gov/expapi/verbs/terminated", display: "terminated" },
} satisfies Record<string, Verb>;

export class XapiSession {
  private launch: LaunchParams | null;
  private activityId: string;
  private activityName: string;

  constructor(activityId: string, activityName: string, search: string = window.location.search) {
    this.activityId = activityId;
    this.activityName = activityName;
    this.launch = parseLaunchParams(search);
  }

  /** True if xAPI launch params were present — the caller uses this to decide whether to use this session at all. */
  get active(): boolean {
    return this.launch !== null;
  }

  private async sendStatement(verb: Verb, result?: Record<string, unknown>): Promise<void> {
    if (!this.launch) return;
    let actor: unknown;
    try {
      actor = JSON.parse(this.launch.actor);
    } catch {
      return; // malformed actor — nothing sane to send
    }
    const statement = {
      actor,
      verb: { id: verb.id, display: { "en-US": verb.display } },
      object: {
        id: this.activityId,
        definition: {
          type: "http://adlnet.gov/expapi/activities/course",
          name: { "en-US": this.activityName },
        },
      },
      ...(this.launch.registration ? { context: { registration: this.launch.registration } } : {}),
      ...(result ? { result } : {}),
    };
    try {
      await fetch(`${this.launch.endpoint}statements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.launch.auth,
          "X-Experience-API-Version": "1.0.3",
        },
        body: JSON.stringify(statement),
      });
    } catch {
      // best-effort — see file header
    }
  }

  start(): void {
    void this.sendStatement(VERBS.launched);
  }

  reportProgress(_completed: number, _total: number): void {
    // xAPI has no direct SCORM-style "bookmark" concept — progress is
    // implied by the completed/scored statements instead.
  }

  reportComplete(): void {
    void this.sendStatement(VERBS.completed, { completion: true });
  }

  reportScore(score: number, passed: boolean): void {
    void this.sendStatement(VERBS.scored, {
      score: { raw: score, min: 0, max: 100, scaled: Math.round((score / 100) * 100) / 100 },
      success: passed,
      completion: true,
    });
  }

  finish(): void {
    void this.sendStatement(VERBS.terminated);
  }
}
