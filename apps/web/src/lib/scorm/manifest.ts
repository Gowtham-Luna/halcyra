// Pure SCORM 1.2 packaging helpers — no browser or Supabase dependencies so
// they can be exercised from Node in verification scripts.

import type { PlayerLesson } from "../../PlayerShell";

export const PACKAGE_FILES = ["index.html", "player.js", "player.css", "data.js"];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildManifest(courseTitle: string, courseId: string): string {
  const title = escapeXml(courseTitle || "Untitled course");
  const id = `com.halcyra.course.${courseId}`;
  const fileEntries = PACKAGE_FILES.map((f) => `      <file href="${f}"/>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>${title}</title>
      <item identifier="ITEM-1" identifierref="RES-1">
        <title>${title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="index.html">
${fileEntries}
    </resource>
  </resources>
</manifest>
`;
}

export function buildDataJs(courseTitle: string, lessons: PlayerLesson[]): string {
  // </script> inside JSON would terminate the script tag early
  const json = JSON.stringify({ title: courseTitle, lessons }).replace(/<\//g, "<\\/");
  return `window.__COURSE_DATA__=${json};`;
}

export function injectDataScript(indexHtml: string): string {
  // data.js must load before the module bundle reads window.__COURSE_DATA__
  return indexHtml.replace("<script", '<script src="./data.js"></script><script');
}
