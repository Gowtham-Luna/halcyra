import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { Block } from "./types";
import { escapeHtml, parseVideoUrl, countBlanks } from "./types";
import { uploadImage, uploadAudio, uploadAttachment, uploadVideo } from "./lib/media";
import { aiPost } from "./lib/api";
import { RichTextEditor } from "./RichTextEditor";

interface Props {
  block: Block;
  onChange: (next: Block) => void;
}

function ImageBlockEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "image" }>;
  onChange: (next: Block) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [genPrompt, setGenPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function generate() {
    const prompt = genPrompt.trim();
    if (!prompt) return;
    setGenerating(true);
    setUploadError(null);
    try {
      const { mimeType, dataBase64 } = await aiPost<{ mimeType: string; dataBase64: string }>(
        "/api/image",
        { prompt },
      );
      const bytes = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0));
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
      const file = new File([bytes], `ai-image.${ext}`, { type: mimeType });
      const url = await uploadImage(file);
      onChange({ ...block, url, alt: block.alt || prompt });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      onChange({ ...block, url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="image-block">
      <div className="image-actions">
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : block.url ? "Replace image" : "Upload image"}
        </button>
        <input
          className="image-url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="…or paste an image URL"
        />
      </div>
      <div className="image-actions">
        <input
          className="image-url"
          value={genPrompt}
          onChange={(e) => setGenPrompt(e.target.value)}
          placeholder="Describe an image to generate, e.g. flat illustration of a fire extinguisher"
          maxLength={500}
          onKeyDown={(e) => e.key === "Enter" && generate()}
        />
        <button onClick={generate} disabled={generating || uploading || !genPrompt.trim()}>
          {generating ? "Generating…" : "✨ Generate"}
        </button>
      </div>
      {uploadError && <p className="message error">{uploadError}</p>}
      {block.url && <img src={block.url} alt={block.alt} className="image-preview" />}
      <select
        value={block.style ?? "centered"}
        onChange={(e) => onChange({ ...block, style: e.target.value as "centered" | "full" | "banner" })}
      >
        <option value="centered">Centered</option>
        <option value="full">Full width</option>
        <option value="banner">Banner (short, wide)</option>
      </select>
      <input
        value={block.alt}
        onChange={(e) => onChange({ ...block, alt: e.target.value })}
        placeholder="Alt text (for accessibility)"
      />
      {block.url && !block.alt.trim() && (
        <p className="message alt-warning">
          ⚠ No alt text — add a short description, or leave blank only if this image is purely decorative.
        </p>
      )}
      <input
        value={block.caption}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
      />
    </div>
  );
}

function ImageTextBlockEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "imageText" }>;
  onChange: (next: Block) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      onChange({ ...block, url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="image-block">
      <select
        value={block.layout}
        onChange={(e) => onChange({ ...block, layout: e.target.value as "left" | "right" | "overlay" })}
      >
        <option value="left">Image left, text right</option>
        <option value="right">Image right, text left</option>
        <option value="overlay">Text on image</option>
      </select>
      <div className="image-actions">
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : block.url ? "Replace image" : "Upload image"}
        </button>
        <input
          className="image-url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="…or paste an image URL"
        />
      </div>
      {uploadError && <p className="message error">{uploadError}</p>}
      {block.url && <img src={block.url} alt={block.alt} className="image-preview" />}
      <input
        value={block.alt}
        onChange={(e) => onChange({ ...block, alt: e.target.value })}
        placeholder="Alt text (for accessibility)"
      />
      {block.url && !block.alt.trim() && (
        <p className="message alt-warning">
          ⚠ No alt text — add a short description, or leave blank only if this image is purely decorative.
        </p>
      )}
      <RichTextEditor
        html={block.html}
        placeholder="Text alongside the image…"
        onChange={(html) => onChange({ ...block, html })}
      />
    </div>
  );
}

function AudioBlockEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "audio" }>;
  onChange: (next: Block) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [script, setScript] = useState("");
  const [voice, setVoice] = useState<"female" | "male">("female");
  const [generating, setGenerating] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadAudio(file);
      onChange({ ...block, url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function generateNarration() {
    const text = script.trim();
    if (!text) return;
    setGenerating(true);
    setUploadError(null);
    try {
      const { mimeType, dataBase64 } = await aiPost<{ mimeType: string; dataBase64: string }>(
        "/api/narration",
        { text, voice },
      );
      const bytes = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0));
      const file = new File([bytes], "narration.mp3", { type: mimeType });
      const url = await uploadAudio(file);
      onChange({ ...block, url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="image-block">
      <div className="image-actions">
        <input
          ref={fileInput}
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : block.url ? "Replace audio" : "Upload audio"}
        </button>
        <input
          className="image-url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="…or paste an audio file URL"
        />
      </div>
      <div className="image-actions">
        <input
          className="image-url"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Narration script to synthesize into speech"
          maxLength={2000}
        />
        <select value={voice} onChange={(e) => setVoice(e.target.value as "female" | "male")}>
          <option value="female">Female voice</option>
          <option value="male">Male voice</option>
        </select>
        <button onClick={generateNarration} disabled={generating || uploading || !script.trim()}>
          {generating ? "Generating…" : "✨ Generate narration"}
        </button>
      </div>
      {uploadError && <p className="message error">{uploadError}</p>}
      {block.url && <audio src={block.url} controls className="audio-preview" />}
      <input
        value={block.caption}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
      />
    </div>
  );
}

function VideoBlockEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "video" }>;
  onChange: (next: Block) => void;
}) {
  const embed = block.url ? parseVideoUrl(block.url) : null;
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  async function startRecording() {
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      chunks.current = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setUploading(true);
        try {
          const file = new File([new Blob(chunks.current, { type: "video/webm" })], "screen-recording.webm", {
            type: "video/webm",
          });
          const url = await uploadVideo(file);
          onChange({ ...block, url });
        } catch (err) {
          setRecordError(err instanceof Error ? err.message : String(err));
        } finally {
          setUploading(false);
        }
      };
      // Learner stopped sharing via the browser's own "Stop sharing" UI.
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        if (mediaRecorder.current?.state === "recording") mediaRecorder.current.stop();
        setRecording(false);
      });
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="image-block">
      <div className="image-actions">
        <input
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="YouTube / Vimeo URL, or a direct .mp4/.webm link"
        />
        {recording ? (
          <button onClick={stopRecording}>⏹ Stop recording</button>
        ) : (
          <button onClick={startRecording} disabled={uploading}>
            {uploading ? "Uploading…" : "🔴 Record screen"}
          </button>
        )}
      </div>
      {recordError && <p className="message error">{recordError}</p>}
      {block.url && !embed && (
        <p className="message error">Unrecognized video URL — use YouTube, Vimeo, or .mp4/.webm</p>
      )}
      {embed?.kind === "iframe" && (
        <div className="video-frame">
          <iframe src={embed.src} title="Video preview" allowFullScreen />
        </div>
      )}
      {embed?.kind === "file" && <video className="video-file" src={embed.src} controls />}
      <input
        value={block.caption}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
      />
    </div>
  );
}

function AttachmentBlockEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "attachment" }>;
  onChange: (next: Block) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadAttachment(file);
      onChange({ ...block, url, filename: block.filename || file.name });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="image-block">
      <div className="image-actions">
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : block.url ? "Replace file" : "Upload file"}
        </button>
        <input
          className="image-url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="…or paste a file URL"
        />
      </div>
      {uploadError && <p className="message error">{uploadError}</p>}
      <input
        value={block.filename}
        onChange={(e) => onChange({ ...block, filename: e.target.value })}
        placeholder="File name shown to learners, e.g. handout.pdf"
      />
      <input
        value={block.label}
        onChange={(e) => onChange({ ...block, label: e.target.value })}
        placeholder="Button label, e.g. Download the worksheet"
      />
    </div>
  );
}

function GalleryBlockEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "gallery" }>;
  onChange: (next: Block) => void;
}) {
  function updateItem(i: number, patch: Partial<{ url: string; alt: string; caption: string }>) {
    const items = [...block.items];
    items[i] = { ...items[i], ...patch };
    onChange({ ...block, items });
  }

  return (
    <div className="items-editor">
      <select
        value={block.layout}
        onChange={(e) =>
          onChange({ ...block, layout: e.target.value as "carousel" | "grid2" | "grid3" | "grid4" })
        }
      >
        <option value="carousel">Carousel</option>
        <option value="grid2">Grid (2 columns)</option>
        <option value="grid3">Grid (3 columns)</option>
        <option value="grid4">Grid (4 columns)</option>
      </select>
      {block.items.map((item, i) => (
        <GalleryItemEditor
          key={i}
          item={item}
          onChange={(patch) => updateItem(i, patch)}
          onRemove={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
          removable={block.items.length > 2}
        />
      ))}
      <button
        className="add-option"
        onClick={() =>
          onChange({ ...block, items: [...block.items, { url: "", alt: "", caption: "" }] })
        }
        disabled={block.items.length >= 8}
      >
        + Add image
      </button>
    </div>
  );
}

function GalleryItemEditor({
  item,
  onChange,
  onRemove,
  removable,
}: {
  item: { url: string; alt: string; caption: string };
  onChange: (patch: Partial<{ url: string; alt: string; caption: string }>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      onChange({ url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="item-editor">
      <div className="item-editor-head">
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : item.url ? "Replace" : "Upload"}
        </button>
        <input
          className="image-url"
          value={item.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="…or paste an image URL"
        />
        <button onClick={onRemove} disabled={!removable} title="Remove image" aria-label="Remove image">✕</button>
      </div>
      {uploadError && <p className="message error">{uploadError}</p>}
      {item.url && <img src={item.url} alt={item.alt} className="image-preview gallery-thumb" />}
      <input
        value={item.alt}
        onChange={(e) => onChange({ alt: e.target.value })}
        placeholder="Alt text"
      />
      {item.url && !item.alt.trim() && (
        <p className="message alt-warning">⚠ No alt text — add a short description.</p>
      )}
      <input
        value={item.caption}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="Caption (optional)"
      />
    </div>
  );
}

function SmallImagePicker({
  url,
  onChange,
  label,
}: {
  url: string | undefined;
  onChange: (url: string | undefined) => void;
  label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="small-image-picker">
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {url && <img src={url} alt="" className="image-preview gallery-thumb" />}
      <button onClick={() => fileInput.current?.click()} disabled={uploading}>
        {uploading ? "Uploading…" : url ? `Replace ${label}` : `+ ${label}`}
      </button>
      {url && (
        <button onClick={() => onChange(undefined)} title={`Remove ${label}`}>
          ✕
        </button>
      )}
      {uploadError && <p className="message error">{uploadError}</p>}
    </div>
  );
}

function LabeledGraphicEditor({
  block,
  onChange,
}: {
  block: Extract<Block, { type: "labeledGraphic" }>;
  onChange: (next: Block) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      onChange({ ...block, url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  function addMarkerAt(e: MouseEvent<HTMLImageElement>) {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onChange({
      ...block,
      markers: [...block.markers, { x, y, title: `Label ${block.markers.length + 1}`, html: "" }],
    });
  }

  return (
    <div className="image-block">
      <div className="image-actions">
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button onClick={() => fileInput.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : block.url ? "Replace image" : "Upload image"}
        </button>
        <input
          className="image-url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          placeholder="…or paste an image URL"
        />
      </div>
      {uploadError && <p className="message error">{uploadError}</p>}
      {block.url && (
        <div className="labeled-graphic-editor-canvas">
          <img
            ref={imgRef}
            src={block.url}
            alt={block.alt}
            className="image-preview"
            onClick={addMarkerAt}
            title="Click to place a label"
          />
          {block.markers.map((m, i) => (
            <span key={i} className="marker-pin" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
              {i + 1}
            </span>
          ))}
        </div>
      )}
      {block.url && <p className="message">Click the image above to add a label.</p>}
      <input
        value={block.alt}
        onChange={(e) => onChange({ ...block, alt: e.target.value })}
        placeholder="Alt text (for accessibility)"
      />
      {block.url && !block.alt.trim() && (
        <p className="message alt-warning">⚠ No alt text — add a short description.</p>
      )}
      {block.markers.map((m, i) => (
        <div className="item-editor" key={i}>
          <div className="item-editor-head">
            <input
              value={m.title}
              onChange={(e) => {
                const markers = [...block.markers];
                markers[i] = { ...m, title: e.target.value };
                onChange({ ...block, markers });
              }}
              placeholder={`Label ${i + 1} title`}
            />
            <button
              onClick={() => onChange({ ...block, markers: block.markers.filter((_, j) => j !== i) })}
              title="Remove label"
              aria-label="Remove label"
            >
              ✕
            </button>
          </div>
          <textarea
            value={m.html}
            onChange={(e) => {
              const markers = [...block.markers];
              markers[i] = { ...m, html: e.target.value };
              onChange({ ...block, markers });
            }}
            placeholder="Description shown when this label is clicked"
            rows={2}
          />
        </div>
      ))}
    </div>
  );
}

export function BlockEditor({ block, onChange }: Props) {
  switch (block.type) {
    case "paragraph":
      return (
        <RichTextEditor
          html={block.html ?? `<p>${escapeHtml(block.text)}</p>`}
          placeholder="Write a paragraph…"
          onChange={(html, plainText) => onChange({ ...block, html, text: plainText })}
        />
      );

    case "callout":
      return (
        <div className="callout-editor">
          <select
            value={block.variant}
            onChange={(e) =>
              onChange({ ...block, variant: e.target.value as "info" | "warning" | "tip" })
            }
          >
            <option value="info">ℹ Info</option>
            <option value="warning">⚠ Warning</option>
            <option value="tip">💡 Tip</option>
          </select>
          <RichTextEditor
            html={block.html}
            placeholder="Callout text…"
            onChange={(html) => onChange({ ...block, html })}
          />
        </div>
      );

    case "accordion":
      return (
        <div className="items-editor">
          {block.items.map((item, i) => (
            <div className="item-editor" key={i}>
              <div className="item-editor-head">
                <input
                  value={item.title}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, title: e.target.value };
                    onChange({ ...block, items });
                  }}
                  placeholder={`Section ${i + 1} title`}
                />
                <button
                  onClick={() =>
                    onChange({ ...block, items: block.items.filter((_, j) => j !== i) })
                  }
                  disabled={block.items.length <= 1}
                  title="Remove section"
                  aria-label="Remove section"
                >
                  ✕
                </button>
              </div>
              <RichTextEditor
                html={item.html}
                placeholder="Section content…"
                onChange={(html) => {
                  const items = [...block.items];
                  items[i] = { ...item, html };
                  onChange({ ...block, items });
                }}
              />
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              onChange({
                ...block,
                items: [...block.items, { title: `Section ${block.items.length + 1}`, html: "" }],
              })
            }
          >
            + Add section
          </button>
        </div>
      );

    case "tabs":
      return (
        <div className="items-editor">
          {block.tabs.map((tab, i) => (
            <div className="item-editor" key={i}>
              <div className="item-editor-head">
                <input
                  value={tab.title}
                  onChange={(e) => {
                    const tabs = [...block.tabs];
                    tabs[i] = { ...tab, title: e.target.value };
                    onChange({ ...block, tabs });
                  }}
                  placeholder={`Tab ${i + 1} title`}
                />
                <button
                  onClick={() => onChange({ ...block, tabs: block.tabs.filter((_, j) => j !== i) })}
                  disabled={block.tabs.length <= 1}
                  title="Remove tab"
                  aria-label="Remove tab"
                >
                  ✕
                </button>
              </div>
              <RichTextEditor
                html={tab.html}
                placeholder="Tab content…"
                onChange={(html) => {
                  const tabs = [...block.tabs];
                  tabs[i] = { ...tab, html };
                  onChange({ ...block, tabs });
                }}
              />
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              onChange({
                ...block,
                tabs: [...block.tabs, { title: `Tab ${block.tabs.length + 1}`, html: "" }],
              })
            }
            disabled={block.tabs.length >= 6}
          >
            + Add tab
          </button>
        </div>
      );

    case "flashcards":
      return (
        <div className="items-editor">
          {block.cards.map((card, i) => (
            <div className="flashcard-editor" key={i}>
              <div className="flashcard-editor-side">
                <textarea
                  value={card.front}
                  onChange={(e) => {
                    const cards = [...block.cards];
                    cards[i] = { ...card, front: e.target.value };
                    onChange({ ...block, cards });
                  }}
                  placeholder="Front (term/question)"
                  rows={2}
                />
                <SmallImagePicker
                  url={card.frontImage}
                  label="image"
                  onChange={(frontImage) => {
                    const cards = [...block.cards];
                    cards[i] = { ...card, frontImage };
                    onChange({ ...block, cards });
                  }}
                />
              </div>
              <div className="flashcard-editor-side">
                <textarea
                  value={card.back}
                  onChange={(e) => {
                    const cards = [...block.cards];
                    cards[i] = { ...card, back: e.target.value };
                    onChange({ ...block, cards });
                  }}
                  placeholder="Back (definition/answer)"
                  rows={2}
                />
                <SmallImagePicker
                  url={card.backImage}
                  label="image"
                  onChange={(backImage) => {
                    const cards = [...block.cards];
                    cards[i] = { ...card, backImage };
                    onChange({ ...block, cards });
                  }}
                />
              </div>
              <button
                onClick={() => onChange({ ...block, cards: block.cards.filter((_, j) => j !== i) })}
                disabled={block.cards.length <= 1}
                title="Remove card"
                aria-label="Remove card"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() => onChange({ ...block, cards: [...block.cards, { front: "", back: "" }] })}
            disabled={block.cards.length >= 12}
          >
            + Add card
          </button>
        </div>
      );

    case "video":
      return <VideoBlockEditor block={block} onChange={onChange} />;

    case "chart": {
      const setLabel = (i: number, value: string) => {
        const labels = [...block.labels];
        labels[i] = value;
        onChange({ ...block, labels });
      };
      const setValue = (i: number, value: string) => {
        const series = [...block.series];
        series[i] = Number(value) || 0;
        onChange({ ...block, series });
      };
      const addPoint = () =>
        onChange({ ...block, labels: [...block.labels, `Item ${block.labels.length + 1}`], series: [...block.series, 0] });
      const removePoint = (i: number) =>
        onChange({
          ...block,
          labels: block.labels.filter((_, j) => j !== i),
          series: block.series.filter((_, j) => j !== i),
        });
      return (
        <div className="table-editor">
          <div className="item-editor-head">
            <input
              value={block.title}
              onChange={(e) => onChange({ ...block, title: e.target.value })}
              placeholder="Chart title (optional)"
            />
            <select
              value={block.chartType}
              onChange={(e) => onChange({ ...block, chartType: e.target.value as "bar" | "line" | "pie" })}
            >
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="pie">Pie</option>
            </select>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {block.labels.map((label, i) => (
                  <tr key={i}>
                    <td>
                      <input value={label} onChange={(e) => setLabel(i, e.target.value)} />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={block.series[i] ?? 0}
                        onChange={(e) => setValue(i, e.target.value)}
                      />
                    </td>
                    <td className="row-actions">
                      <button
                        onClick={() => removePoint(i)}
                        disabled={block.labels.length <= 1}
                        title="Remove"
                        aria-label={`Remove ${label}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="add-option" onClick={addPoint} disabled={block.labels.length >= 12}>
            + Add data point
          </button>
        </div>
      );
    }

    case "scenario": {
      const setNode = (nodeId: string, patch: Partial<Extract<Block, { type: "scenario" }>["nodes"][number]>) =>
        onChange({ ...block, nodes: block.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)) });
      const addNode = () => {
        const id = crypto.randomUUID();
        onChange({ ...block, nodes: [...block.nodes, { id, speaker: "", line: "", choices: [] }] });
      };
      const removeNode = (nodeId: string) =>
        onChange({
          ...block,
          startNodeId: block.startNodeId === nodeId ? (block.nodes.find((n) => n.id !== nodeId)?.id ?? "") : block.startNodeId,
          nodes: block.nodes
            .filter((n) => n.id !== nodeId)
            .map((n) => ({
              ...n,
              choices: n.choices.map((c) => (c.nextNodeId === nodeId ? { ...c, nextNodeId: null } : c)),
            })),
        });
      return (
        <div className="items-editor scenario-editor">
          <label className="item-editor-head">
            <span>Start node</span>
            <select value={block.startNodeId} onChange={(e) => onChange({ ...block, startNodeId: e.target.value })}>
              {block.nodes.map((n, i) => (
                <option key={n.id} value={n.id}>
                  {n.speaker || `Node ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          {block.nodes.map((node, i) => (
            <div className="item-editor scenario-node" key={node.id}>
              <div className="item-editor-head">
                <input
                  value={node.speaker}
                  onChange={(e) => setNode(node.id, { speaker: e.target.value })}
                  placeholder={`Speaker (node ${i + 1})`}
                />
                <button
                  onClick={() => removeNode(node.id)}
                  disabled={block.nodes.length <= 1}
                  title="Remove node"
                  aria-label="Remove node"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={node.line}
                onChange={(e) => setNode(node.id, { line: e.target.value })}
                placeholder="What they say…"
                rows={2}
              />
              <p className="message">Choices (leave empty for an ending)</p>
              {node.choices.map((choice, ci) => (
                <div className="item-editor-head" key={ci}>
                  <input
                    value={choice.text}
                    onChange={(e) => {
                      const choices = [...node.choices];
                      choices[ci] = { ...choice, text: e.target.value };
                      setNode(node.id, { choices });
                    }}
                    placeholder="Choice text"
                  />
                  <select
                    value={choice.nextNodeId ?? ""}
                    onChange={(e) => {
                      const choices = [...node.choices];
                      choices[ci] = { ...choice, nextNodeId: e.target.value || null };
                      setNode(node.id, { choices });
                    }}
                  >
                    <option value="">— End —</option>
                    {block.nodes.map((n, ni) => (
                      <option key={n.id} value={n.id}>
                        {n.speaker || `Node ${ni + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setNode(node.id, { choices: node.choices.filter((_, j) => j !== ci) })}
                    title="Remove choice"
                    aria-label="Remove choice"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                className="add-option"
                onClick={() => setNode(node.id, { choices: [...node.choices, { text: "", nextNodeId: null }] })}
                disabled={node.choices.length >= 5}
              >
                + Add choice
              </button>
            </div>
          ))}
          <button className="add-block" onClick={addNode}>+ Add node</button>
        </div>
      );
    }

    case "heading":
      return (
        <div className="heading-block">
          <select
            value={block.level}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            className={`block-heading h${block.level}`}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Heading text"
          />
        </div>
      );

    case "list":
      return (
        <div className="list-block">
          <select
            value={block.style}
            onChange={(e) =>
              onChange({ ...block, style: e.target.value as "bullet" | "number" | "check" })
            }
          >
            <option value="bullet">• Bulleted</option>
            <option value="number">1. Numbered</option>
            <option value="check">☑ Checkbox</option>
          </select>
          {block.items.map((item, i) => (
            <div className="list-item" key={i}>
              <span className="list-marker">
                {block.style === "bullet" ? "•" : block.style === "check" ? "☐" : `${i + 1}.`}
              </span>
              <input
                value={item}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = e.target.value;
                  onChange({ ...block, items });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const items = [...block.items];
                    items.splice(i + 1, 0, "");
                    onChange({ ...block, items });
                  } else if (e.key === "Backspace" && item === "" && block.items.length > 1) {
                    e.preventDefault();
                    onChange({ ...block, items: block.items.filter((_, j) => j !== i) });
                  }
                }}
                placeholder="List item (Enter adds, Backspace on empty removes)"
              />
            </div>
          ))}
        </div>
      );

    case "divider":
      return (
        <div className="list-block">
          <select
            value={block.style ?? "line"}
            onChange={(e) =>
              onChange({ ...block, style: e.target.value as "line" | "spacer" | "continue" })
            }
          >
            <option value="line">— Line</option>
            <option value="spacer">␣ Spacer</option>
            <option value="continue">▼ Continue button (gates content below)</option>
          </select>
          {(block.style ?? "line") === "line" && <hr className="divider-block" />}
          {block.style === "spacer" && <div className="spacer-block-editor">(vertical space)</div>}
          {block.style === "continue" && (
            <button className="continue-btn" disabled>Continue ▾</button>
          )}
        </div>
      );

    case "quote":
      return (
        <div className="items-editor">
          <textarea
            className="block-body"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Quote text…"
            rows={2}
          />
          <div className="item-editor-head">
            <input
              value={block.cite}
              onChange={(e) => onChange({ ...block, cite: e.target.value })}
              placeholder="Who said it"
            />
            <input
              value={block.role}
              onChange={(e) => onChange({ ...block, role: e.target.value })}
              placeholder="Role/title (optional)"
            />
          </div>
        </div>
      );

    case "statement":
      return (
        <div className="callout-editor">
          <select
            value={block.variant}
            onChange={(e) =>
              onChange({ ...block, variant: e.target.value as "bold" | "accent" })
            }
          >
            <option value="bold">Bold (large, centered)</option>
            <option value="accent">Accent (left border)</option>
          </select>
          <RichTextEditor
            html={block.html}
            placeholder="Statement text…"
            onChange={(html) => onChange({ ...block, html })}
          />
        </div>
      );

    case "table": {
      const setCell = (r: number, c: number, value: string) => {
        const rows = block.rows.map((row) => [...row]);
        rows[r][c] = value;
        onChange({ ...block, rows });
      };
      const setHeader = (c: number, value: string) => {
        const header = [...block.header];
        header[c] = value;
        onChange({ ...block, header });
      };
      const addRow = () =>
        onChange({ ...block, rows: [...block.rows, block.header.map(() => "")] });
      const addCol = () =>
        onChange({
          ...block,
          header: [...block.header, `Column ${block.header.length + 1}`],
          rows: block.rows.map((row) => [...row, ""]),
        });
      const removeRow = (r: number) =>
        onChange({ ...block, rows: block.rows.filter((_, i) => i !== r) });
      const removeCol = (c: number) =>
        onChange({
          ...block,
          header: block.header.filter((_, i) => i !== c),
          rows: block.rows.map((row) => row.filter((_, i) => i !== c)),
        });
      return (
        <div className="table-editor">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {block.header.map((h, c) => (
                    <th key={c}>
                      <input value={h} onChange={(e) => setHeader(c, e.target.value)} />
                      <button
                        onClick={() => removeCol(c)}
                        disabled={block.header.length <= 1}
                        title="Remove column"
                        aria-label="Remove column"
                      >
                        ✕
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c}>
                        <input value={cell} onChange={(e) => setCell(r, c, e.target.value)} />
                      </td>
                    ))}
                    <td className="row-actions">
                      <button
                        onClick={() => removeRow(r)}
                        disabled={block.rows.length <= 1}
                        title="Remove row"
                        aria-label="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="item-editor-head">
            <button className="add-option" onClick={addRow}>+ Row</button>
            <button className="add-option" onClick={addCol} disabled={block.header.length >= 6}>
              + Column
            </button>
          </div>
        </div>
      );
    }

    case "columns":
      return (
        <div className="columns-editor">
          <RichTextEditor
            html={block.leftHtml}
            placeholder="Left column…"
            onChange={(leftHtml) => onChange({ ...block, leftHtml })}
          />
          <RichTextEditor
            html={block.rightHtml}
            placeholder="Right column…"
            onChange={(rightHtml) => onChange({ ...block, rightHtml })}
          />
        </div>
      );

    case "button":
      return (
        <div className="item-editor-head">
          <input
            value={block.label}
            onChange={(e) => onChange({ ...block, label: e.target.value })}
            placeholder="Button label"
          />
          <input
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="https://link-to-open"
          />
        </div>
      );

    case "mcq":
      return (
        <div className="mcq-block">
          <input
            className="block-heading"
            value={block.question}
            onChange={(e) => onChange({ ...block, question: e.target.value })}
            placeholder="Question"
          />
          {block.options.map((option, i) => (
            <div className="mcq-option" key={i}>
              <input
                type="radio"
                name={`correct-${block.id}`}
                checked={block.correctIndex === i}
                onChange={() => onChange({ ...block, correctIndex: i })}
                title="Mark as correct answer"
                aria-label="Mark as correct answer"
              />
              <input
                value={option}
                onChange={(e) => {
                  const options = [...block.options];
                  options[i] = e.target.value;
                  onChange({ ...block, options });
                }}
                placeholder={`Option ${i + 1}`}
              />
              <button
                onClick={() => {
                  if (block.options.length <= 2) return;
                  const options = block.options.filter((_, j) => j !== i);
                  const correctIndex =
                    block.correctIndex === i
                      ? 0
                      : block.correctIndex > i
                        ? block.correctIndex - 1
                        : block.correctIndex;
                  onChange({ ...block, options, correctIndex });
                }}
                disabled={block.options.length <= 2}
                title="Remove option"
                aria-label="Remove option"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() => onChange({ ...block, options: [...block.options, ""] })}
            disabled={block.options.length >= 5}
          >
            + Add option
          </button>
          <textarea
            className="block-body"
            value={block.feedback}
            onChange={(e) => onChange({ ...block, feedback: e.target.value })}
            placeholder="Feedback shown after answering (why the correct answer is right)"
            rows={2}
          />
        </div>
      );

    case "multiResponse":
      return (
        <div className="mcq-block">
          <input
            className="block-heading"
            value={block.question}
            onChange={(e) => onChange({ ...block, question: e.target.value })}
            placeholder="Question (select all correct answers)"
          />
          {block.options.map((option, i) => (
            <div className="mcq-option" key={i}>
              <input
                type="checkbox"
                checked={block.correctIndexes.includes(i)}
                onChange={(e) => {
                  const correctIndexes = e.target.checked
                    ? [...block.correctIndexes, i]
                    : block.correctIndexes.filter((j) => j !== i);
                  onChange({ ...block, correctIndexes });
                }}
                title="Mark as a correct answer"
                aria-label="Mark as a correct answer"
              />
              <input
                value={option}
                onChange={(e) => {
                  const options = [...block.options];
                  options[i] = e.target.value;
                  onChange({ ...block, options });
                }}
                placeholder={`Option ${i + 1}`}
              />
              <button
                onClick={() => {
                  if (block.options.length <= 2) return;
                  const options = block.options.filter((_, j) => j !== i);
                  const correctIndexes = block.correctIndexes
                    .filter((j) => j !== i)
                    .map((j) => (j > i ? j - 1 : j));
                  onChange({ ...block, options, correctIndexes });
                }}
                disabled={block.options.length <= 2}
                title="Remove option"
                aria-label="Remove option"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() => onChange({ ...block, options: [...block.options, ""] })}
            disabled={block.options.length >= 6}
          >
            + Add option
          </button>
          <textarea
            className="block-body"
            value={block.feedback}
            onChange={(e) => onChange({ ...block, feedback: e.target.value })}
            placeholder="Feedback shown after answering"
            rows={2}
          />
        </div>
      );

    case "fillBlank": {
      const blanks = countBlanks(block.template);
      const setAnswer = (i: number, raw: string) => {
        const answers = block.answers.map((a) => [...a]);
        while (answers.length < blanks) answers.push([""]);
        answers[i] = raw.split(",").map((s) => s.trim());
        onChange({ ...block, answers: answers.slice(0, blanks) });
      };
      return (
        <div className="items-editor">
          <textarea
            className="block-body"
            value={block.template}
            onChange={(e) => {
              const template = e.target.value;
              const nextBlanks = countBlanks(template);
              const answers = Array.from(
                { length: nextBlanks },
                (_, i) => block.answers[i] ?? [""],
              );
              onChange({ ...block, template, answers });
            }}
            placeholder="Sentence with ___ marking each blank, e.g. The capital of France is ___."
            rows={2}
          />
          {blanks === 0 && (
            <p className="message">Add at least one blank using three underscores: ___</p>
          )}
          {Array.from({ length: blanks }, (_, i) => (
            <input
              key={i}
              value={(block.answers[i] ?? []).join(", ")}
              onChange={(e) => setAnswer(i, e.target.value)}
              placeholder={`Accepted answers for blank ${i + 1}, comma-separated`}
            />
          ))}
          <textarea
            className="block-body"
            value={block.feedback}
            onChange={(e) => onChange({ ...block, feedback: e.target.value })}
            placeholder="Feedback shown after answering"
            rows={2}
          />
        </div>
      );
    }

    case "matching":
      return (
        <div className="items-editor">
          {block.pairs.map((pair, i) => (
            <div className="item-editor-head" key={i}>
              <input
                value={pair.left}
                onChange={(e) => {
                  const pairs = [...block.pairs];
                  pairs[i] = { ...pair, left: e.target.value };
                  onChange({ ...block, pairs });
                }}
                placeholder={`Item ${i + 1}`}
              />
              <input
                value={pair.right}
                onChange={(e) => {
                  const pairs = [...block.pairs];
                  pairs[i] = { ...pair, right: e.target.value };
                  onChange({ ...block, pairs });
                }}
                placeholder="Matches with…"
              />
              <button
                onClick={() => onChange({ ...block, pairs: block.pairs.filter((_, j) => j !== i) })}
                disabled={block.pairs.length <= 2}
                title="Remove pair"
                aria-label="Remove pair"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() => onChange({ ...block, pairs: [...block.pairs, { left: "", right: "" }] })}
            disabled={block.pairs.length >= 8}
          >
            + Add pair
          </button>
          <textarea
            className="block-body"
            value={block.feedback}
            onChange={(e) => onChange({ ...block, feedback: e.target.value })}
            placeholder="Feedback shown after answering (optional)"
            rows={2}
          />
        </div>
      );

    case "labeledGraphic":
      return <LabeledGraphicEditor block={block} onChange={onChange} />;

    case "process":
      return (
        <div className="items-editor">
          {block.steps.map((step, i) => (
            <div className="item-editor" key={i}>
              <div className="item-editor-head">
                <input
                  value={step.title}
                  onChange={(e) => {
                    const steps = [...block.steps];
                    steps[i] = { ...step, title: e.target.value };
                    onChange({ ...block, steps });
                  }}
                  placeholder={`Step ${i + 1} title`}
                />
                <button
                  onClick={() => onChange({ ...block, steps: block.steps.filter((_, j) => j !== i) })}
                  disabled={block.steps.length <= 1}
                  title="Remove step"
                  aria-label="Remove step"
                >
                  ✕
                </button>
              </div>
              <RichTextEditor
                html={step.html}
                placeholder="Step description…"
                onChange={(html) => {
                  const steps = [...block.steps];
                  steps[i] = { ...step, html };
                  onChange({ ...block, steps });
                }}
              />
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              onChange({
                ...block,
                steps: [...block.steps, { title: `Step ${block.steps.length + 1}`, html: "" }],
              })
            }
          >
            + Add step
          </button>
        </div>
      );

    case "timeline":
      return (
        <div className="items-editor">
          {block.items.map((item, i) => (
            <div className="item-editor" key={i}>
              <div className="item-editor-head">
                <input
                  value={item.label}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, label: e.target.value };
                    onChange({ ...block, items });
                  }}
                  placeholder="Date/label, e.g. 1990"
                  className="timeline-label-input"
                />
                <input
                  value={item.title}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, title: e.target.value };
                    onChange({ ...block, items });
                  }}
                  placeholder="Title"
                />
                <button
                  onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
                  disabled={block.items.length <= 1}
                  title="Remove entry"
                  aria-label="Remove entry"
                >
                  ✕
                </button>
              </div>
              <RichTextEditor
                html={item.html}
                placeholder="Description…"
                onChange={(html) => {
                  const items = [...block.items];
                  items[i] = { ...item, html };
                  onChange({ ...block, items });
                }}
              />
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              onChange({ ...block, items: [...block.items, { label: "", title: "", html: "" }] })
            }
          >
            + Add entry
          </button>
        </div>
      );

    case "sorting":
      return (
        <div className="items-editor">
          <p className="message">Categories</p>
          {block.categories.map((cat, i) => (
            <div className="item-editor-head" key={i}>
              <input
                value={cat}
                onChange={(e) => {
                  const categories = [...block.categories];
                  categories[i] = e.target.value;
                  onChange({ ...block, categories });
                }}
                placeholder={`Category ${i + 1}`}
              />
              <button
                onClick={() => {
                  const categories = block.categories.filter((_, j) => j !== i);
                  const items = block.items
                    .filter((it) => it.category !== i)
                    .map((it) => ({ ...it, category: it.category > i ? it.category - 1 : it.category }));
                  onChange({ ...block, categories, items });
                }}
                disabled={block.categories.length <= 2}
                title="Remove category"
                aria-label="Remove category"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              onChange({
                ...block,
                categories: [...block.categories, `Category ${block.categories.length + 1}`],
              })
            }
            disabled={block.categories.length >= 4}
          >
            + Add category
          </button>
          <p className="message">Items</p>
          {block.items.map((item, i) => (
            <div className="item-editor-head" key={i}>
              <input
                value={item.text}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...item, text: e.target.value };
                  onChange({ ...block, items });
                }}
                placeholder={`Item ${i + 1}`}
              />
              <select
                value={item.category}
                onChange={(e) => {
                  const items = [...block.items];
                  items[i] = { ...item, category: Number(e.target.value) };
                  onChange({ ...block, items });
                }}
              >
                {block.categories.map((cat, ci) => (
                  <option key={ci} value={ci}>
                    {cat || `Category ${ci + 1}`}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}
                disabled={block.items.length <= 2}
                title="Remove item"
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="add-option"
            onClick={() =>
              onChange({ ...block, items: [...block.items, { text: "", category: 0 }] })
            }
            disabled={block.items.length >= 12}
          >
            + Add item
          </button>
          <textarea
            className="block-body"
            value={block.feedback}
            onChange={(e) => onChange({ ...block, feedback: e.target.value })}
            placeholder="Feedback shown after checking (optional)"
            rows={2}
          />
        </div>
      );

    case "image":
      return <ImageBlockEditor block={block} onChange={onChange} />;

    case "imageText":
      return <ImageTextBlockEditor block={block} onChange={onChange} />;

    case "audio":
      return <AudioBlockEditor block={block} onChange={onChange} />;

    case "attachment":
      return <AttachmentBlockEditor block={block} onChange={onChange} />;

    case "gallery":
      return <GalleryBlockEditor block={block} onChange={onChange} />;

    case "embed":
      return (
        <div className="image-block">
          <input
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="Embed URL (e.g. a form, map, or interactive doc)"
          />
          <input
            value={block.title}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="Title (for accessibility)"
          />
          <input
            type="number"
            className="embed-height-input"
            value={block.height}
            min={200}
            max={1200}
            onChange={(e) => onChange({ ...block, height: Number(e.target.value) || 480 })}
            placeholder="Height (px)"
          />
          {block.url && (
            <div className="embed-frame" style={{ height: block.height }}>
              <iframe src={block.url} title={block.title || "Embedded content"} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            </div>
          )}
        </div>
      );
  }
}
