// AI narration provider seam. MVP provider is Google Cloud Text-to-Speech
// (REST, API-key auth) — per CLAUDE.md this is the sanctioned free-tier
// choice (ElevenLabs free tier is non-commercial only). IMPORTANT: unlike
// Gemini, Cloud TTS's free monthly quota (1M chars for standard voices)
// requires a GCP project with BILLING ENABLED. Do not enable billing on the
// same project used for Gemini — that would remove Gemini's free tier
// entirely (see CLAUDE.md). Use a separate GCP project for
// HALCYRA_GOOGLE_TTS_API_KEY, with Cloud Text-to-Speech API enabled there.

const API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

export interface GeneratedNarration {
  mimeType: string;
  data: Buffer;
}

export async function generateNarration(
  text: string,
  voice: "female" | "male" = "female",
): Promise<GeneratedNarration> {
  const apiKey = process.env.HALCYRA_GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("HALCYRA_GOOGLE_TTS_API_KEY is not set");

  const voiceName = voice === "male" ? "en-US-Standard-D" : "en-US-Standard-C";
  const res = await fetch(`${API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "en-US", name: voiceName },
      audioConfig: { audioEncoding: "MP3" },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TTS provider responded ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { audioContent?: string };
  if (!json.audioContent) throw new Error("TTS provider returned no audio");
  return { mimeType: "audio/mpeg", data: Buffer.from(json.audioContent, "base64") };
}
