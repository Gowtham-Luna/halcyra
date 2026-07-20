import { generateJson } from "./gemini.js";

export interface OutlineBlock {
  heading: string;
  body: string;
}

export interface OutlineResult {
  title: string;
  blocks: OutlineBlock[];
}

const outlineJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Course title" },
    blocks: {
      type: "array",
      minItems: 4,
      maxItems: 10,
      items: {
        type: "object",
        properties: {
          heading: { type: "string", description: "Lesson/section heading" },
          body: {
            type: "string",
            description:
              "2-3 sentence summary of what this lesson covers and why",
          },
        },
        required: ["heading", "body"],
      },
    },
  },
  required: ["title", "blocks"],
};

export async function generateOutline(topic: string): Promise<OutlineResult> {
  const parsed = await generateJson<OutlineResult>(
    `You are an instructional designer. Create a course outline for the topic: "${topic}". Produce a concise course title and 4-10 lesson blocks, each with a heading and a 2-3 sentence body describing what the lesson covers and why it matters to the learner.`,
    outlineJsonSchema,
  );
  if (!parsed.title || !Array.isArray(parsed.blocks)) {
    throw new Error("Model response did not match outline schema");
  }
  return parsed;
}

export async function generateOutlineFromDocument(documentText: string): Promise<OutlineResult> {
  const parsed = await generateJson<OutlineResult>(
    `You are an instructional designer turning a source document into an online course. Below is the extracted text of that document (it may include noisy formatting artifacts — ignore those). Produce a concise course title and 4-10 lesson blocks that organize the document's actual content into a logical learning sequence, each with a heading and a 2-3 sentence body summarizing what that lesson covers. Base the outline strictly on the document's content — do not invent unrelated material.

Document text:
"""
${documentText}
"""`,
    outlineJsonSchema,
  );
  if (!parsed.title || !Array.isArray(parsed.blocks)) {
    throw new Error("Model response did not match outline schema");
  }
  return parsed;
}
