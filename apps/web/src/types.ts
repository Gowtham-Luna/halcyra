export type Block =
  // text = plain-text fallback/summary; html (when present) is the rich version
  | { id: string; type: "paragraph"; text: string; html?: string }
  | { id: string; type: "heading"; text: string; level: 2 | 3 }
  | { id: string; type: "callout"; variant: "info" | "warning" | "tip"; html: string }
  | { id: string; type: "accordion"; items: { title: string; html: string }[] }
  | { id: string; type: "tabs"; tabs: { title: string; html: string }[] }
  | {
      id: string;
      type: "flashcards";
      cards: { front: string; back: string; frontImage?: string; backImage?: string }[];
    }
  | {
      id: string;
      type: "labeledGraphic";
      url: string;
      alt: string;
      markers: { x: number; y: number; title: string; html: string }[];
    }
  | { id: string; type: "process"; steps: { title: string; html: string }[] }
  | { id: string; type: "timeline"; items: { label: string; title: string; html: string }[] }
  | {
      id: string;
      type: "sorting";
      categories: string[];
      items: { text: string; category: number }[];
      feedback: string;
    }
  | { id: string; type: "video"; url: string; caption: string }
  | {
      id: string;
      type: "chart";
      chartType: "bar" | "line" | "pie";
      title: string;
      labels: string[];
      series: number[];
    }
  | {
      id: string;
      type: "scenario";
      startNodeId: string;
      nodes: {
        id: string;
        speaker: string;
        line: string;
        image?: string;
        choices: { text: string; nextNodeId: string | null }[];
      }[];
    }
  | { id: string; type: "list"; items: string[]; style: "bullet" | "number" | "check" }
  // style undefined (legacy) renders as "line"
  | { id: string; type: "divider"; style?: "line" | "spacer" | "continue" }
  | { id: string; type: "quote"; text: string; cite: string; role: string }
  | { id: string; type: "statement"; variant: "bold" | "accent"; html: string }
  | { id: string; type: "table"; header: string[]; rows: string[][] }
  | { id: string; type: "columns"; leftHtml: string; rightHtml: string }
  | { id: string; type: "button"; label: string; url: string }
  // style undefined (legacy) renders as "centered"
  | { id: string; type: "image"; url: string; alt: string; caption: string; style?: "centered" | "full" | "banner" }
  | { id: string; type: "imageText"; url: string; alt: string; layout: "left" | "right" | "overlay"; html: string }
  | { id: string; type: "audio"; url: string; caption: string }
  | { id: string; type: "embed"; url: string; title: string; height: number }
  | { id: string; type: "attachment"; url: string; filename: string; label: string }
  | {
      id: string;
      type: "gallery";
      layout: "carousel" | "grid2" | "grid3" | "grid4";
      items: { url: string; alt: string; caption: string }[];
    }
  | {
      id: string;
      type: "mcq";
      question: string;
      options: string[];
      correctIndex: number;
      feedback: string;
    }
  | {
      id: string;
      type: "multiResponse";
      question: string;
      options: string[];
      correctIndexes: number[];
      feedback: string;
    }
  | {
      id: string;
      type: "fillBlank";
      // Sentence with "___" marking each blank, e.g. "The capital of France is ___."
      template: string;
      // Accepted answers per blank, in template order; each blank may have several accepted spellings
      answers: string[][];
      feedback: string;
    }
  | { id: string; type: "matching"; pairs: { left: string; right: string }[]; feedback: string };

export type BlockType = Block["type"];

export type QuizQuestionBlock = Extract<
  Block,
  { type: "mcq" | "multiResponse" | "fillBlank" | "matching" }
>;

export function isQuizQuestion(block: Block): block is QuizQuestionBlock {
  return (
    block.type === "mcq" ||
    block.type === "multiResponse" ||
    block.type === "fillBlank" ||
    block.type === "matching"
  );
}

export interface QuizSettings {
  enabled: boolean;
  passMark: number; // percent, 0-100
  shuffle: boolean;
  maxAttempts: number; // 0 = unlimited
  // Question bank: draw this many questions at random from the lesson's full
  // pool of quiz-question blocks each attempt. 0/unset = use every question.
  drawCount?: number;
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  enabled: false,
  passMark: 80,
  shuffle: false,
  maxAttempts: 0,
  drawCount: 0,
};

export function newBlock(type: BlockType): Block {
  const id = crypto.randomUUID();
  switch (type) {
    case "paragraph":
      return { id, type, text: "" };
    case "heading":
      return { id, type, text: "", level: 2 };
    case "list":
      return { id, type, items: [""], style: "bullet" };
    case "divider":
      return { id, type };
    case "image":
      return { id, type, url: "", alt: "", caption: "", style: "centered" };
    case "imageText":
      return { id, type, url: "", alt: "", layout: "left", html: "" };
    case "audio":
      return { id, type, url: "", caption: "" };
    case "embed":
      return { id, type, url: "", title: "", height: 480 };
    case "attachment":
      return { id, type, url: "", filename: "", label: "Download" };
    case "gallery":
      return {
        id,
        type,
        layout: "grid2",
        items: [
          { url: "", alt: "", caption: "" },
          { url: "", alt: "", caption: "" },
        ],
      };
    case "mcq":
      return { id, type, question: "", options: ["", ""], correctIndex: 0, feedback: "" };
    case "multiResponse":
      return { id, type, question: "", options: ["", ""], correctIndexes: [], feedback: "" };
    case "fillBlank":
      return { id, type, template: "The capital of France is ___.", answers: [[""]], feedback: "" };
    case "matching":
      return {
        id,
        type,
        pairs: [
          { left: "", right: "" },
          { left: "", right: "" },
        ],
        feedback: "",
      };
    case "callout":
      return { id, type, variant: "info", html: "" };
    case "accordion":
      return { id, type, items: [{ title: "Section 1", html: "" }] };
    case "tabs":
      return { id, type, tabs: [{ title: "Tab 1", html: "" }] };
    case "flashcards":
      return { id, type, cards: [{ front: "", back: "" }] };
    case "labeledGraphic":
      return { id, type, url: "", alt: "", markers: [] };
    case "process":
      return { id, type, steps: [{ title: "Step 1", html: "" }] };
    case "timeline":
      return { id, type, items: [{ label: "", title: "", html: "" }] };
    case "sorting":
      return {
        id,
        type,
        categories: ["Category 1", "Category 2"],
        items: [
          { text: "", category: 0 },
          { text: "", category: 1 },
        ],
        feedback: "",
      };
    case "video":
      return { id, type, url: "", caption: "" };
    case "chart":
      return {
        id,
        type,
        chartType: "bar",
        title: "",
        labels: ["A", "B", "C"],
        series: [1, 2, 3],
      };
    case "scenario": {
      const startId = crypto.randomUUID();
      return {
        id,
        type,
        startNodeId: startId,
        nodes: [{ id: startId, speaker: "Narrator", line: "", choices: [] }],
      };
    }
    case "quote":
      return { id, type, text: "", cite: "", role: "" };
    case "statement":
      return { id, type, variant: "bold", html: "" };
    case "table":
      return { id, type, header: ["Column 1", "Column 2"], rows: [["", ""]] };
    case "columns":
      return { id, type, leftHtml: "", rightHtml: "" };
    case "button":
      return { id, type, label: "Learn more", url: "" };
  }
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Parse a video URL into an embeddable form (YouTube/Vimeo iframe or direct file). */
export function parseVideoUrl(
  url: string,
): { kind: "iframe"; src: string } | { kind: "file"; src: string } | null {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (yt) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "iframe", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { kind: "file", src: url };
  return null;
}

export function countBlanks(template: string): number {
  return (template.match(/___/g) ?? []).length;
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function gradeQuizQuestion(
  block: QuizQuestionBlock,
  answer: unknown,
): boolean {
  switch (block.type) {
    case "mcq":
      return typeof answer === "number" && answer === block.correctIndex;
    case "multiResponse": {
      if (!(answer instanceof Set)) return false;
      const correct = new Set(block.correctIndexes);
      return answer.size === correct.size && [...answer].every((i) => correct.has(i));
    }
    case "fillBlank": {
      if (!Array.isArray(answer)) return false;
      return block.answers.every((accepted, i) => {
        const given = String(answer[i] ?? "").trim().toLowerCase();
        return given.length > 0 && accepted.some((a) => a.trim().toLowerCase() === given);
      });
    }
    case "matching": {
      if (!Array.isArray(answer)) return false;
      return block.pairs.every((pair, i) => answer[i] === pair.right);
    }
  }
}

// Localization: run every user-facing string in a block through `mapper`.
// Used both to COLLECT strings (mapper pushes to an array, returns input
// unchanged) and to APPLY translated strings back (mapper shifts off a
// translated queue) — reusing the exact same field-order traversal for both
// directions is what guarantees they stay positionally in sync.
export function mapBlockStrings(block: Block, mapper: (s: string) => string): Block {
  switch (block.type) {
    case "paragraph":
      return { ...block, text: mapper(block.text), html: block.html !== undefined ? mapper(block.html) : undefined };
    case "heading":
      return { ...block, text: mapper(block.text) };
    case "callout":
      return { ...block, html: mapper(block.html) };
    case "accordion":
      return { ...block, items: block.items.map((i) => ({ title: mapper(i.title), html: mapper(i.html) })) };
    case "tabs":
      return { ...block, tabs: block.tabs.map((t) => ({ title: mapper(t.title), html: mapper(t.html) })) };
    case "flashcards":
      return { ...block, cards: block.cards.map((c) => ({ ...c, front: mapper(c.front), back: mapper(c.back) })) };
    case "labeledGraphic":
      return {
        ...block,
        alt: mapper(block.alt),
        markers: block.markers.map((m) => ({ ...m, title: mapper(m.title), html: mapper(m.html) })),
      };
    case "process":
      return { ...block, steps: block.steps.map((s) => ({ title: mapper(s.title), html: mapper(s.html) })) };
    case "timeline":
      return {
        ...block,
        items: block.items.map((i) => ({ ...i, label: mapper(i.label), title: mapper(i.title), html: mapper(i.html) })),
      };
    case "sorting":
      return {
        ...block,
        categories: block.categories.map(mapper),
        items: block.items.map((i) => ({ ...i, text: mapper(i.text) })),
        feedback: mapper(block.feedback),
      };
    case "video":
      return { ...block, caption: mapper(block.caption) };
    case "chart":
      return { ...block, title: mapper(block.title), labels: block.labels.map(mapper) };
    case "scenario":
      return {
        ...block,
        nodes: block.nodes.map((n) => ({
          ...n,
          speaker: mapper(n.speaker),
          line: mapper(n.line),
          choices: n.choices.map((c) => ({ ...c, text: mapper(c.text) })),
        })),
      };
    case "list":
      return { ...block, items: block.items.map(mapper) };
    case "divider":
      return block;
    case "quote":
      return { ...block, text: mapper(block.text), cite: mapper(block.cite), role: mapper(block.role) };
    case "statement":
      return { ...block, html: mapper(block.html) };
    case "table":
      return { ...block, header: block.header.map(mapper), rows: block.rows.map((row) => row.map(mapper)) };
    case "columns":
      return { ...block, leftHtml: mapper(block.leftHtml), rightHtml: mapper(block.rightHtml) };
    case "button":
      return { ...block, label: mapper(block.label) };
    case "image":
      return { ...block, alt: mapper(block.alt), caption: mapper(block.caption) };
    case "imageText":
      return { ...block, alt: mapper(block.alt), html: mapper(block.html) };
    case "audio":
      return { ...block, caption: mapper(block.caption) };
    case "embed":
      return { ...block, title: mapper(block.title) };
    case "attachment":
      return { ...block, filename: mapper(block.filename), label: mapper(block.label) };
    case "gallery":
      return { ...block, items: block.items.map((i) => ({ ...i, alt: mapper(i.alt), caption: mapper(i.caption) })) };
    case "mcq":
      return { ...block, question: mapper(block.question), options: block.options.map(mapper), feedback: mapper(block.feedback) };
    case "multiResponse":
      return { ...block, question: mapper(block.question), options: block.options.map(mapper), feedback: mapper(block.feedback) };
    case "fillBlank":
      return {
        ...block,
        template: mapper(block.template),
        answers: block.answers.map((a) => a.map(mapper)),
        feedback: mapper(block.feedback),
      };
    case "matching":
      return {
        ...block,
        pairs: block.pairs.map((p) => ({ left: mapper(p.left), right: mapper(p.right) })),
        feedback: mapper(block.feedback),
      };
  }
}

export function collectStrings(blocks: Block[]): string[] {
  const collected: string[] = [];
  for (const block of blocks) {
    mapBlockStrings(block, (s) => {
      collected.push(s);
      return s;
    });
  }
  return collected;
}

export function applyTranslatedStrings(blocks: Block[], translated: string[]): Block[] {
  let i = 0;
  return blocks.map((block) => mapBlockStrings(block, () => translated[i++] ?? ""));
}

export interface Lesson {
  id: string;
  heading: string;
  body: string;
  position: number;
  section?: string;
}

export interface CourseSummary {
  id: string;
  title: string;
  topic: string;
  updated_at: string;
  theme?: CourseTheme | null;
}

// Course branding: accent color + font pairing + nav mode + cover page.
// Applied as CSS custom properties (see themeStyleVars) rather than per-component
// props, so any screen can opt in just by spreading the style object onto a wrapper.

export type FontPairing = "sans" | "serif" | "rounded" | "classic";
export type NavMode = "sidebar" | "compact" | "overlay";
export type CoverLayout = "centered" | "left" | "minimal";

export interface CourseTheme {
  accentColor: string;
  fontPairing: FontPairing;
  navMode: NavMode;
  coverImage?: string;
  coverLayout: CoverLayout;
}

export const DEFAULT_THEME: CourseTheme = {
  accentColor: "#6c5ce7",
  fontPairing: "sans",
  navMode: "sidebar",
  coverLayout: "centered",
};

export const ACCENT_PRESETS = ["#6c5ce7", "#0984e3", "#00b894", "#e17055", "#d63031", "#2d3436"];

export const FONT_PAIRINGS: Record<FontPairing, { label: string; heading: string; body: string }> = {
  sans: {
    label: "Modern sans",
    heading: "'Segoe UI', system-ui, -apple-system, sans-serif",
    body: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  serif: {
    label: "Editorial serif",
    heading: "Georgia, 'Times New Roman', serif",
    body: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  rounded: {
    label: "Friendly rounded",
    heading: "'Trebuchet MS', 'Segoe UI', sans-serif",
    body: "'Trebuchet MS', 'Segoe UI', sans-serif",
  },
  classic: {
    label: "Classic serif",
    heading: "Georgia, serif",
    body: "Georgia, serif",
  },
};

export function themeStyleVars(theme: CourseTheme | null | undefined): Record<string, string> {
  const t = theme ?? DEFAULT_THEME;
  const fonts = FONT_PAIRINGS[t.fontPairing] ?? FONT_PAIRINGS.sans;
  return {
    "--accent": t.accentColor || DEFAULT_THEME.accentColor,
    "--font-heading": fonts.heading,
    "--font-body": fonts.body,
  };
}

/** Group items that carry an optional `section` label into ordered runs, matching source order. */
export function groupBySection<T extends { section?: string }>(
  items: T[],
): { section: string | null; items: T[] }[] {
  const groups: { section: string | null; items: T[] }[] = [];
  for (const item of items) {
    const section = item.section?.trim() || null;
    const last = groups[groups.length - 1];
    if (last && last.section === section) last.items.push(item);
    else groups.push({ section, items: [item] });
  }
  return groups;
}
