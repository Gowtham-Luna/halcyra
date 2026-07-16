import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { generateOutline } from "./outline.js";
import { generateLessonBlocks, generateQuiz, regenerateBlock } from "./content.js";
import { generateImage } from "./image.js";

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
app.use(express.json());

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

app.post("/api/block", requireUser, async (req, res) => {
  const lessonHeading = str(req.body?.lessonHeading, 300);
  const block = req.body?.block;
  const validTypes = ["paragraph", "heading", "list", "mcq", "callout", "quote"];
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

app.listen(PORT, () => {
  console.log(`Halcyra API listening on http://localhost:${PORT}`);
});
