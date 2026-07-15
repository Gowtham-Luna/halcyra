import { GoogleGenAI } from "@google/genai";

// Provider-swappable AI layer: model + key come from env; callers only see
// generateJson(prompt, schema). Swapping providers means rewriting this file.
const MODEL = process.env.HALCYRA_AI_MODEL ?? "gemini-2.5-flash";

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.HALCYRA_GEMINI_API_KEY;
  if (!apiKey) throw new Error("HALCYRA_GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export async function generateJson<T>(prompt: string, schema: unknown): Promise<T> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Empty response from model");
  return JSON.parse(text) as T;
}
