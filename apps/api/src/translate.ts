// AI translation provider seam. Primary choice per CLAUDE.md is DeepL's free
// tier (500k chars/month, needs a DeepL API Free account — deepl.com/pro-api
// — separate signup from Gemini). LibreTranslate is the fallback CLAUDE.md
// names, but self-hosting it is a heavier lift than fits free-tier infra
// (translation models are memory-hungry) and public instances are
// unreliable without their own key, so it's not wired up here; swap this
// file for LibreTranslate later if that trade-off changes.
//
// DeepL's tag_handling:"html" is used for the whole batch — it's permissive
// (plain text without tags still translates normally) and protects the raw
// HTML stored in rich-text block fields from having its markup mangled.

const API_URL = process.env.HALCYRA_DEEPL_API_URL ?? "https://api-free.deepl.com/v2/translate";

interface DeeplResponse {
  translations: { text: string; detected_source_language?: string }[];
}

export async function translateTexts(texts: string[], targetLang: string): Promise<string[]> {
  const apiKey = process.env.HALCYRA_DEEPL_API_KEY;
  if (!apiKey) throw new Error("HALCYRA_DEEPL_API_KEY is not set");
  if (texts.length === 0) return [];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: JSON.stringify({
      text: texts,
      target_lang: targetLang.toUpperCase(),
      tag_handling: "html",
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Translation provider responded ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as DeeplResponse;
  if (!Array.isArray(json.translations) || json.translations.length !== texts.length) {
    throw new Error("Translation provider returned an unexpected number of results");
  }
  return json.translations.map((t) => t.text);
}
