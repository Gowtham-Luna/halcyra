import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// Doc-to-course text extraction. New dependencies this session: pdf-parse
// (v2 API — PDFParse class, not the old v1 function export) and mammoth.
// Both run server-side so the client only ever sends/receives JSON, matching
// the rest of this API (no multipart middleware needed).

export const ACCEPTED_DOC_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function extractDocumentText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }
  throw new Error(`Unsupported document type: ${mimeType}`);
}
