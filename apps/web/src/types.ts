export type Block =
  // text = plain-text fallback/summary; html (when present) is the rich version
  | { id: string; type: "paragraph"; text: string; html?: string }
  | { id: string; type: "heading"; text: string; level: 2 | 3 }
  | { id: string; type: "callout"; variant: "info" | "warning" | "tip"; html: string }
  | { id: string; type: "accordion"; items: { title: string; html: string }[] }
  | { id: string; type: "tabs"; tabs: { title: string; html: string }[] }
  | { id: string; type: "flashcards"; cards: { front: string; back: string }[] }
  | { id: string; type: "video"; url: string; caption: string }
  | { id: string; type: "list"; items: string[]; style: "bullet" | "number" | "check" }
  // style undefined (legacy) renders as "line"
  | { id: string; type: "divider"; style?: "line" | "spacer" | "continue" }
  | { id: string; type: "quote"; text: string; cite: string; role: string }
  | { id: string; type: "statement"; variant: "bold" | "accent"; html: string }
  | { id: string; type: "table"; header: string[]; rows: string[][] }
  | { id: string; type: "columns"; leftHtml: string; rightHtml: string }
  | { id: string; type: "button"; label: string; url: string }
  | { id: string; type: "image"; url: string; alt: string; caption: string }
  | {
      id: string;
      type: "mcq";
      question: string;
      options: string[];
      correctIndex: number;
      feedback: string;
    };

export type BlockType = Block["type"];

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
      return { id, type, url: "", alt: "", caption: "" };
    case "mcq":
      return { id, type, question: "", options: ["", ""], correctIndex: 0, feedback: "" };
    case "callout":
      return { id, type, variant: "info", html: "" };
    case "accordion":
      return { id, type, items: [{ title: "Section 1", html: "" }] };
    case "tabs":
      return { id, type, tabs: [{ title: "Tab 1", html: "" }] };
    case "flashcards":
      return { id, type, cards: [{ front: "", back: "" }] };
    case "video":
      return { id, type, url: "", caption: "" };
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

export interface Lesson {
  id: string;
  heading: string;
  body: string;
  position: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  topic: string;
  updated_at: string;
}
