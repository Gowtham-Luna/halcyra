import { zipSync, strToU8 } from "fflate";
import { supabase } from "../supabase";
import type { PlayerLesson } from "../../PlayerShell";
import { buildManifest, buildDataJs, injectDataScript } from "./manifest";

async function fetchAsset(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Missing player asset ${path} — run npm run build:player`);
  }
  return res.text();
}

export async function exportScormZip(courseId: string): Promise<void> {
  const [courseRes, lessonsRes] = await Promise.all([
    supabase.from("courses").select("title").eq("id", courseId).single(),
    supabase
      .from("lessons")
      .select("id, heading, blocks")
      .eq("course_id", courseId)
      .order("position", { ascending: true }),
  ]);
  if (courseRes.error) throw new Error(courseRes.error.message);
  if (lessonsRes.error) throw new Error(lessonsRes.error.message);
  const title = courseRes.data.title;
  const lessons = lessonsRes.data as PlayerLesson[];
  if (lessons.length === 0) throw new Error("Course has no lessons to export");

  const [indexHtml, playerJs, playerCss] = await Promise.all([
    fetchAsset("/scorm-player/index.html"),
    fetchAsset("/scorm-player/player.js"),
    fetchAsset("/scorm-player/player.css"),
  ]);

  const zip = zipSync({
    "imsmanifest.xml": strToU8(buildManifest(title, courseId)),
    "index.html": strToU8(injectDataScript(indexHtml)),
    "player.js": strToU8(playerJs),
    "player.css": strToU8(playerCss),
    "data.js": strToU8(buildDataJs(title, lessons)),
  });

  const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (title || "course").replace(/[^\w\d-]+/g, "-").toLowerCase();
  a.download = `${safeName}-scorm12.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
