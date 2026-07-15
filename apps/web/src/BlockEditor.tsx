import { useRef, useState } from "react";
import type { Block } from "./types";
import { uploadImage } from "./lib/media";
import { aiPost } from "./lib/api";

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
      <input
        value={block.alt}
        onChange={(e) => onChange({ ...block, alt: e.target.value })}
        placeholder="Alt text (for accessibility)"
      />
      <input
        value={block.caption}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
      />
    </div>
  );
}

export function BlockEditor({ block, onChange }: Props) {
  switch (block.type) {
    case "paragraph":
      return (
        <textarea
          className="block-body"
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Write a paragraph…"
          rows={3}
        />
      );

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
              onChange({ ...block, style: e.target.value as "bullet" | "number" })
            }
          >
            <option value="bullet">• Bulleted</option>
            <option value="number">1. Numbered</option>
          </select>
          {block.items.map((item, i) => (
            <div className="list-item" key={i}>
              <span className="list-marker">{block.style === "bullet" ? "•" : `${i + 1}.`}</span>
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
      return <hr className="divider-block" />;

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

    case "image":
      return <ImageBlockEditor block={block} onChange={onChange} />;
  }
}
