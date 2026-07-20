import { zipSync, strToU8 } from "fflate";
import { supabase } from "../supabase";
import type { PlayerLesson } from "../../PlayerShell";
import {
  buildManifest12,
  buildManifest2004,
  buildTinCanXml,
  buildDataJs,
  injectDataScript,
} from "./manifest";
import type { ExportFormat } from "./manifest";

async function fetchAsset(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Missing player asset ${path} — run npm run build:player`);
  }
  return res.text();
}

const FORMAT_LABELS: Record<ExportFormat, { suffix: string; manifestFile: string }> = {
  scorm12: { suffix: "scorm12", manifestFile: "imsmanifest.xml" },
  scorm2004: { suffix: "scorm2004", manifestFile: "imsmanifest.xml" },
  xapi: { suffix: "xapi", manifestFile: "tincan.xml" },
};

export async function exportCourseZip(courseId: string, format: ExportFormat): Promise<void> {
  const [courseRes, lessonsRes] = await Promise.all([
    supabase.from("courses").select("title, description, theme, locale").eq("id", courseId).single(),
    supabase
      .from("lessons")
      .select("id, heading, blocks, quiz_settings, section")
      .eq("course_id", courseId)
      .order("position", { ascending: true }),
  ]);
  if (courseRes.error) throw new Error(courseRes.error.message);
  if (lessonsRes.error) throw new Error(lessonsRes.error.message);
  const title = courseRes.data.title;
  const description = courseRes.data.description;
  const theme = courseRes.data.theme;
  const locale = courseRes.data.locale;
  const lessons: PlayerLesson[] = lessonsRes.data.map((l) => ({
    id: l.id,
    heading: l.heading,
    blocks: l.blocks,
    quizSettings: l.quiz_settings,
    section: l.section,
  }));
  if (lessons.length === 0) throw new Error("Course has no lessons to export");

  const [indexHtml, playerJs, playerCss] = await Promise.all([
    fetchAsset("/scorm-player/index.html"),
    fetchAsset("/scorm-player/player.js"),
    fetchAsset("/scorm-player/player.css"),
  ]);

  const manifest =
    format === "scorm12"
      ? buildManifest12(title, courseId)
      : format === "scorm2004"
        ? buildManifest2004(title, courseId)
        : buildTinCanXml(title, courseId);
  const { suffix, manifestFile } = FORMAT_LABELS[format];

  const zip = zipSync({
    [manifestFile]: strToU8(manifest),
    "index.html": strToU8(injectDataScript(indexHtml)),
    "player.js": strToU8(playerJs),
    "player.css": strToU8(playerCss),
    "data.js": strToU8(buildDataJs(courseId, title, lessons, description, theme, locale)),
  });

  const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (title || "course").replace(/[^\w\d-]+/g, "-").toLowerCase();
  a.download = `${safeName}-${suffix}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
