// Pure packaging helpers for SCORM 1.2, SCORM 2004, and xAPI (Tin Can) —
// no browser or Supabase dependencies so they can be exercised from Node in
// verification scripts. All three formats share the same index.html/
// player.js/player.css/data.js (see apps/web/standalone/main.tsx, which
// auto-detects the runtime reporting backend); only the manifest file and
// its declared schema differ per format.

import type { PlayerLesson } from "../../PlayerShell";
import type { CourseTheme } from "../../types";

export type ExportFormat = "scorm12" | "scorm2004" | "xapi";

export const PACKAGE_FILES = ["index.html", "player.js", "player.css", "data.js"];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildManifest12(courseTitle: string, courseId: string): string {
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

export function buildManifest2004(courseTitle: string, courseId: string): string {
  const title = escapeXml(courseTitle || "Untitled course");
  const id = `com.halcyra.course.${courseId}`;
  const fileEntries = PACKAGE_FILES.map((f) => `      <file href="${f}"/>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                      http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                      http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                      http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
                      http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 4th Edition</schemaversion>
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
    <resource identifier="RES-1" type="webcontent" adlcp:scormType="sco" href="index.html">
${fileEntries}
    </resource>
  </resources>
</manifest>
`;
}

export function buildTinCanXml(courseTitle: string, courseId: string): string {
  const title = escapeXml(courseTitle || "Untitled course");
  const activityId = escapeXml(`https://halcyra.app/course/${courseId}`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<tincan xmlns="http://projecttincan.com/tincan.xsd">
  <activities>
    <activity id="${activityId}" type="http://adlnet.gov/expapi/activities/course">
      <name>${title}</name>
      <description lang="en-US">${title}</description>
      <launch lang="en-US">index.html</launch>
    </activity>
  </activities>
</tincan>
`;
}

export function buildDataJs(
  courseId: string,
  courseTitle: string,
  lessons: PlayerLesson[],
  courseDescription?: string | null,
  theme?: CourseTheme | null,
  locale?: string,
): string {
  // </script> inside JSON would terminate the script tag early
  const json = JSON.stringify({
    id: courseId,
    title: courseTitle,
    description: courseDescription,
    theme,
    locale,
    lessons,
  }).replace(/<\//g, "<\\/");
  return `window.__COURSE_DATA__=${json};`;
}

export function injectDataScript(indexHtml: string): string {
  // data.js must load before the module bundle reads window.__COURSE_DATA__
  return indexHtml.replace("<script", '<script src="./data.js"></script><script');
}
