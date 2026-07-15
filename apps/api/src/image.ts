// AI image provider seam. MVP provider is Pollinations.ai: keyless and free
// (no SLA — swap this module for a paid provider before scale; verified
// 2026-07 that Gemini image models have no free-tier API quota).

const PROVIDER_URL = process.env.HALCYRA_IMAGE_PROVIDER_URL ?? "https://image.pollinations.ai/prompt/";

export interface GeneratedImage {
  mimeType: string;
  data: Buffer;
}

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const url = `${PROVIDER_URL}${encodeURIComponent(prompt)}?width=1024&height=640&nologo=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) {
    throw new Error(`Image provider responded ${res.status}`);
  }
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    throw new Error(`Image provider returned non-image content (${mimeType})`);
  }
  return { mimeType, data: Buffer.from(await res.arrayBuffer()) };
}
