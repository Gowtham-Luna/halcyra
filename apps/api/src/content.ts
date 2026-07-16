import { generateJson } from "./gemini.js";

// Mirrors the block union in apps/web/src/types.ts (kept in sync by hand
// until a shared package is justified).
export type Block =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; text: string; level: 2 | 3 }
  | { id: string; type: "list"; items: string[]; style: "bullet" | "number" | "check" }
  | { id: string; type: "divider"; style?: "line" | "spacer" | "continue" }
  | { id: string; type: "image"; url: string; alt: string; caption: string }
  | { id: string; type: "callout"; variant: "info" | "warning" | "tip"; html: string }
  | { id: string; type: "quote"; text: string; cite: string; role: string }
  | {
      id: string;
      type: "mcq";
      question: string;
      options: string[];
      correctIndex: number;
      feedback: string;
    };

// Flat schema instead of a union: Gemini's JSON-schema support is safest with
// a single object shape; we validate and narrow server-side in mapRawBlock.
interface RawBlock {
  type: string;
  text?: string;
  level?: number;
  items?: string[];
  style?: string;
  variant?: string;
  cite?: string;
  question?: string;
  options?: string[];
  correctIndex?: number;
  feedback?: string;
}

const rawBlockSchema = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["paragraph", "heading", "list", "mcq", "callout", "quote"],
      description: "Block type",
    },
    cite: {
      type: "string",
      description: "Quote attribution (who said it)",
    },
    variant: {
      type: "string",
      enum: ["info", "warning", "tip"],
      description: "Callout style",
    },
    text: { type: "string", description: "Text for paragraph/heading blocks" },
    level: { type: "integer", enum: [2, 3], description: "Heading level" },
    items: { type: "array", items: { type: "string" }, description: "List items" },
    style: { type: "string", enum: ["bullet", "number"], description: "List style" },
    question: { type: "string", description: "MCQ question" },
    options: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
      description: "MCQ answer options",
    },
    correctIndex: {
      type: "integer",
      description: "0-based index of the correct option",
    },
    feedback: {
      type: "string",
      description: "Shown after answering: why the correct answer is right",
    },
  },
  required: ["type"],
};

const blocksResponseSchema = {
  type: "object",
  properties: {
    blocks: { type: "array", items: rawBlockSchema },
  },
  required: ["blocks"],
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mapRawBlock(raw: RawBlock): Block | null {
  const id = crypto.randomUUID();
  switch (raw.type) {
    case "paragraph":
      return raw.text ? { id, type: "paragraph", text: raw.text } : null;
    case "callout": {
      if (!raw.text) return null;
      const variant =
        raw.variant === "warning" || raw.variant === "tip" ? raw.variant : "info";
      return { id, type: "callout", variant, html: `<p>${escapeHtml(raw.text)}</p>` };
    }
    case "quote":
      return raw.text
        ? { id, type: "quote", text: raw.text, cite: raw.cite ?? "", role: "" }
        : null;
    case "heading":
      return raw.text
        ? { id, type: "heading", text: raw.text, level: raw.level === 3 ? 3 : 2 }
        : null;
    case "list":
      return raw.items && raw.items.length > 0
        ? {
            id,
            type: "list",
            items: raw.items,
            style: raw.style === "number" ? "number" : "bullet",
          }
        : null;
    case "mcq": {
      const { question, options, correctIndex, feedback } = raw;
      if (!question || !options || options.length < 2) return null;
      const idx =
        typeof correctIndex === "number" && correctIndex >= 0 && correctIndex < options.length
          ? correctIndex
          : 0;
      return { id, type: "mcq", question, options, correctIndex: idx, feedback: feedback ?? "" };
    }
    default:
      return null;
  }
}

export interface LessonContext {
  courseTitle: string;
  topic: string;
  lessonHeading: string;
  lessonBody: string;
}

export async function generateLessonBlocks(ctx: LessonContext): Promise<Block[]> {
  const result = await generateJson<{ blocks: RawBlock[] }>(
    `You are an instructional designer writing a lesson for the course "${ctx.courseTitle}" (topic: ${ctx.topic}).
Lesson: "${ctx.lessonHeading}". Summary of what it should cover: ${ctx.lessonBody || "(none provided — infer from the heading)"}.
Write the full lesson content as 5-10 content blocks: use heading blocks (level 2 or 3) to structure sections, paragraph blocks for explanations (2-4 sentences each), list blocks for enumerable points, and at most one callout block (variant info/warning/tip) for a key takeaway or caution. Do NOT include mcq blocks. Write directly to the learner in clear, practical language.`,
    blocksResponseSchema,
  );
  const blocks = result.blocks.map(mapRawBlock).filter((b): b is Block => b !== null);
  if (blocks.length === 0) throw new Error("Model returned no usable blocks");
  return blocks;
}

export async function generateQuiz(
  ctx: LessonContext & { contentSummary: string },
): Promise<Block[]> {
  const result = await generateJson<{ blocks: RawBlock[] }>(
    `You are an instructional designer writing a knowledge check for the lesson "${ctx.lessonHeading}" in the course "${ctx.courseTitle}".
Lesson content summary: ${ctx.contentSummary || ctx.lessonBody || "(infer from the heading)"}.
Write 2-4 mcq blocks. Each must have a clear question, 3-5 plausible options, the 0-based correctIndex, and feedback explaining why the correct answer is right. Only return mcq blocks.`,
    blocksResponseSchema,
  );
  const blocks = result.blocks
    .filter((b) => b.type === "mcq")
    .map(mapRawBlock)
    .filter((b): b is Block => b !== null);
  if (blocks.length === 0) throw new Error("Model returned no usable quiz questions");
  return blocks;
}

export async function regenerateBlock(params: {
  courseTitle: string;
  lessonHeading: string;
  block: RawBlock;
  instruction: string;
}): Promise<Block> {
  const result = await generateJson<{ blocks: RawBlock[] }>(
    `You are an instructional designer improving one content block in the lesson "${params.lessonHeading}" (course "${params.courseTitle}").
Current block (JSON): ${JSON.stringify(params.block)}
${params.instruction ? `Author's instruction: ${params.instruction}` : "Rewrite it to be clearer and more engaging."}
Return exactly one block of the same type ("${params.block.type}") in the blocks array.`,
    blocksResponseSchema,
  );
  const mapped = result.blocks
    .filter((b) => b.type === params.block.type)
    .map(mapRawBlock)
    .filter((b): b is Block => b !== null);
  if (mapped.length === 0) throw new Error("Model did not return a usable block");
  return mapped[0];
}
