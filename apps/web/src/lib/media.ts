import { supabase } from "./supabase";

// Media provider seam: the rest of the app only calls uploadImage(file).
// MVP backend is Supabase Storage (public 'media' bucket, per-user folders);
// swapping to Cloudflare R2 later means rewriting only this file.

const BUCKET = "media";

const IMAGE_ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const AUDIO_ALLOWED = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a"];
const AUDIO_MAX_BYTES = 15 * 1024 * 1024;

const ATTACHMENT_ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
];
const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;

const VIDEO_ALLOWED = ["video/webm", "video/mp4"];
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

async function uploadToBucket(file: File, allowed: string[], maxBytes: number, label: string): Promise<string> {
  if (!allowed.includes(file.type)) {
    throw new Error(`Unsupported ${label} type: ${file.type || "unknown"}`);
  }
  if (file.size > maxBytes) {
    throw new Error(`${label[0].toUpperCase()}${label.slice(1)} is too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)`);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not signed in");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadImage(file: File): Promise<string> {
  return uploadToBucket(file, IMAGE_ALLOWED, IMAGE_MAX_BYTES, "image");
}

export async function uploadAudio(file: File): Promise<string> {
  return uploadToBucket(file, AUDIO_ALLOWED, AUDIO_MAX_BYTES, "audio file");
}

export async function uploadAttachment(file: File): Promise<string> {
  return uploadToBucket(file, ATTACHMENT_ALLOWED, ATTACHMENT_MAX_BYTES, "file");
}

export async function uploadVideo(file: File): Promise<string> {
  return uploadToBucket(file, VIDEO_ALLOWED, VIDEO_MAX_BYTES, "video file");
}
