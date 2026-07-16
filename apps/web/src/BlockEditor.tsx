import { useRef, useState } from "react";
import type { Block } from "./types";
import { escapeHtml, parseVideoUrl } from "./types";
import { uploadImage } from "./lib/media";
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
              <button
                onClick={() => onChange({ ...block, cards: block.cards.filter((_, j) => j !== i) })}
                disabled={block.cards.length <= 1}
                title="Remove card"
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

    case "video": {
      const embed = block.url ? parseVideoUrl(block.url) : null;
      return (
        <div className="image-block">
          <input
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="YouTube / Vimeo URL, or a direct .mp4 link"
          />
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
