import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { generateOutline, generateOutlineFromDocument } from "./outline.js";
import { generateLessonBlocks, generateQuiz, generateSummary, regenerateBlock } from "./content.js";
import { generateImage } from "./image.js";
import { generateNarration } from "./tts.js";
import { ACCEPTED_DOC_MIME_TYPES, extractDocumentText } from "./docParse.js";
import { translateTexts } from "./translate.js";

const SUPABASE_URL = process.env.HALCYRA_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.HALCYRA_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("HALCYRA_SUPABASE_URL / HALCYRA_SUPABASE_ANON_KEY not set");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Render (and most PaaS) inject PORT; HALCYRA_API_PORT is the local override.
const PORT = Number(process.env.PORT ?? process.env.HALCYRA_API_PORT ?? 8787);

const app = express();
// Behind Render's proxy the client IP arrives via X-Forwarded-For.
app.set("trust proxy", 1);
app.use(cors({ origin: process.env.HALCYRA_WEB_ORIGIN ?? "http://localhost:5173" }));
// Default 100kb is too small for a base64-encoded document upload (doc-outline).
app.use(express.json({ limit: "12mb" }));

// AI endpoints are the expensive surface (Gemini free tier ~10 RPM total):
// cap each user/IP well below the shared quota so one user can't starve it.
app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    limit: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests — wait a minute and retry" },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

async function requireUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  next();
}

function sendGenerationError(res: Response, err: unknown) {
  // Gemini free tier is ~10 RPM: surface 429s distinctly so the UI can say "try again shortly".
  const message = err instanceof Error ? err.message : String(err);
  const isRateLimit = message.includes("429") || message.includes("RESOURCE_EXHAUSTED");
  console.error("generation failed:", message);
  res
    .status(isRateLimit ? 429 : 502)
    .json({ error: isRateLimit ? "AI rate limit hit — wait a minute and retry" : "Generation failed" });
}

function str(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

app.post("/api/outline", requireUser, async (req, res) => {
  const topic = str(req.body?.topic, 300);
  if (!topic) {
    res.status(400).json({ error: "Provide a topic (1-300 chars)" });
    return;
  }
  try {
    res.json(await generateOutline(topic));
  } catch (err) {
    sendGenerationError(res, err);
  }
});

const MAX_DOC_BYTES = 8 * 1024 * 1024;
const MAX_DOC_TEXT_CHARS = 30_000;

app.post("/api/doc-outline", requireUser, async (req, res) => {
  const mimeType = str(req.body?.mimeType, 200);
  const fileBase64 = typeof req.body?.fileBase64 === "string" ? req.body.fileBase64 : "";
  if (!fileBase64 || !ACCEPTED_DOC_MIME_TYPES.includes(mimeType)) {
    res.status(400).json({ error: `Provide fileBase64 and mimeType (${ACCEPTED_DOC_MIME_TYPES.join(", ")})` });
    return;
  }
  let buffer: Buffer;
  try {
    buffer = Buffer.from(fileBase64, "base64");
  } catch {
    res.status(400).json({ error: "fileBase64 is not valid base64" });
    return;
  }
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_DOC_BYTES) {
    res.status(400).json({ error: "File must be non-empty and under 8MB" });
    return;
  }
  try {
    const text = (await extractDocumentText(buffer, mimeType)).trim().slice(0, MAX_DOC_TEXT_CHARS);
    if (!text) {
      res.status(400).json({ error: "No extractable text found in this file" });
      return;
    }
    res.json(await generateOutlineFromDocument(text));
  } catch (err) {
    sendGenerationError(res, err);
  }
});

app.post("/api/lesson-content", requireUser, async (req, res) => {
  const lessonHeading = str(req.body?.lessonHeading, 300);
  if (!lessonHeading) {
    res.status(400).json({ error: "Provide lessonHeading" });
    return;
  }
  try {
    const blocks = await generateLessonBlocks({
      courseTitle: str(req.body?.courseTitle, 300),
      topic: str(req.body?.topic, 300),
      lessonHeading,
      lessonBody: str(req.body?.lessonBody, 2000),
    });
    res.json({ blocks });
  } catch (err) {
    sendGenerationError(res, err);
  }
});

app.post("/api/quiz", requireUser, async (req, res) => {
  const lessonHeading = str(req.body?.lessonHeading, 300);
  if (!lessonHeading) {
    res.status(400).json({ error: "Provide lessonHeading" });
    return;
  }
  try {
    const blocks = await generateQuiz({
      courseTitle: str(req.body?.courseTitle, 300),
      topic: str(req.body?.topic, 300),
      lessonHeading,
      lessonBody: str(req.body?.lessonBody, 2000),
      contentSummary: str(req.body?.contentSummary, 6000),
    });
    res.json({ blocks });
  } catch (err) {
    sendGenerationError(res, err);
  }
});

app.post("/api/summary", requireUser, async (req, res) => {
  const lessonHeading = str(req.body?.lessonHeading, 300);
  if (!lessonHeading) {
    res.status(400).json({ error: "Provide lessonHeading" });
    return;
  }
  try {
    const blocks = await generateSummary({
      courseTitle: str(req.body?.courseTitle, 300),
      topic: str(req.body?.topic, 300),
      lessonHeading,
      lessonBody: str(req.body?.lessonBody, 2000),
      contentSummary: str(req.body?.contentSummary, 6000),
    });
    res.json({ blocks });
  } catch (err) {
    sendGenerationError(res, err);
  }
});

app.post("/api/block", requireUser, async (req, res) => {
  const lessonHeading = str(req.body?.lessonHeading, 300);
  const block = req.body?.block;
  const validTypes = [
    "paragraph",
    "heading",
    "list",
    "mcq",
    "multiResponse",
    "fillBlank",
    "callout",
    "quote",
  ];
  if (!lessonHeading || typeof block !== "object" || block === null || !validTypes.includes(block.type)) {
    res.status(400).json({ error: `Provide lessonHeading and a block of type ${validTypes.join("/")}` });
    return;
  }
  try {
    const result = await regenerateBlock({
      courseTitle: str(req.body?.courseTitle, 300),
      lessonHeading,
      block,
      instruction: str(req.body?.instruction, 500),
    });
    res.json({ block: result });
  } catch (err) {
    sendGenerationError(res, err);
  }
});

const MAX_TRANSLATE_ITEMS = 60;
const MAX_TRANSLATE_ITEM_CHARS = 4000;

app.post("/api/translate", requireUser, async (req, res) => {
  const texts = Array.isArray(req.body?.texts) ? req.body.texts : null;
  const targetLang = str(req.body?.targetLang, 10);
  if (!texts || texts.length === 0 || texts.length > MAX_TRANSLATE_ITEMS || !targetLang) {
    res.status(400).json({ error: `Provide 1-${MAX_TRANSLATE_ITEMS} texts and a targetLang` });
    return;
  }
  if (!texts.every((t: unknown) => typeof t === "string" && t.length <= MAX_TRANSLATE_ITEM_CHARS)) {
    res.status(400).json({ error: `Each text must be a string under ${MAX_TRANSLATE_ITEM_CHARS} chars` });
    return;
  }
  try {
    const translated = await translateTexts(texts, targetLang);
    res.json({ texts: translated });
  } catch (err) {
    sendGenerationError(res, err);
  }
});

app.post("/api/image", requireUser, async (req, res) => {
  const prompt = str(req.body?.prompt, 500);
  if (!prompt) {
    res.status(400).json({ error: "Provide a prompt (1-500 chars)" });
    return;
  }
  try {
    const image = await generateImage(prompt);
    res.json({ mimeType: image.mimeType, dataBase64: image.data.toString("base64") });
  } catch (err) {
    sendGenerationError(res, err);
  }
});

app.post("/api/narration", requireUser, async (req, res) => {
  const text = str(req.body?.text, 2000);
  const voice = req.body?.voice === "male" ? "male" : "female";
  if (!text) {
    res.status(400).json({ error: "Provide text (1-2000 chars)" });
    return;
  }
  try {
    const audio = await generateNarration(text, voice);
    res.json({ mimeType: audio.mimeType, dataBase64: audio.data.toString("base64") });
  } catch (err) {
    sendGenerationError(res, err);
  }
});

app.listen(PORT, () => {
  console.log(`Halcyra API listening on http://localhost:${PORT}`);
});
