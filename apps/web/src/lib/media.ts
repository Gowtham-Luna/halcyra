import { supabase } from "./supabase";

// Media provider seam: the rest of the app only calls uploadImage(file).
// MVP backend is Supabase Storage (public 'media' bucket, per-user folders);
// swapping to Cloudflare R2 later means rewriting only this file.

const BUCKET = "media";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

export async function uploadImage(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error("Unsupported image type — use PNG, JPEG, WebP, GIF, or SVG");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large (max 5MB)");
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
