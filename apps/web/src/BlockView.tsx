import { useState } from "react";
import DOMPurify from "dompurify";
import type { Block } from "./types";
import { parseVideoUrl } from "./types";

// Author-produced HTML rendered to learners (who may be strangers via share
// links) — always sanitize.
function RichText({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={`rich ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  );
}

function AccordionView({ block }: { block: Extract<Block, { type: "accordion" }> }) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  return (
    <div className="accordion-view">
      {block.items.map((item, i) => (
        <div className="accordion-item" key={i}>
          <button
            className="accordion-title"
            onClick={() =>
              setOpen((s) => {
                const next = new Set(s);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
          >
            <span>{item.title}</span>
            <span>{open.has(i) ? "−" : "+"}</span>
          </button>
          {open.has(i) && <RichText html={item.html} className="accordion-body" />}
        </div>
      ))}
    </div>
  );
}

function TabsView({ block }: { block: Extract<Block, { type: "tabs" }> }) {
  const [active, setActive] = useState(0);
  const tab = block.tabs[Math.min(active, block.tabs.length - 1)];
  return (
    <div className="tabs-view">
      <div className="tabs-bar">
        {block.tabs.map((t, i) => (
          <button
            key={i}
            className={`tab-title ${i === active ? "active" : ""}`}
            onClick={() => setActive(i)}
          >
            {t.title}
          </button>
        ))}
      </div>
      {tab && <RichText html={tab.html} className="tab-body" />}
    </div>
  );
}

function FlashcardsView({ block }: { block: Extract<Block, { type: "flashcards" }> }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  return (
    <div className="flashcards-view">
      {block.cards.map((card, i) => {
        const isFlipped = flipped.has(i);
        return (
          <button
            key={i}
            className={`flashcard ${isFlipped ? "flipped" : ""}`}
            onClick={() =>
              setFlipped((s) => {
                const next = new Set(s);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
            title="Click to flip"
          >
            <span className="flashcard-side-label">{isFlipped ? "Back" : "Front"}</span>
            <span className="flashcard-text">{isFlipped ? card.back : card.front}</span>
          </button>
        );
      })}
    </div>
  );
}

// Learner-facing block renderer. Used by lesson preview now and the course
// player (slice 6) later — keep it free of any authoring/editor concerns.

function McqView({ block }: { block: Extract<Block, { type: "mcq" }> }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && selected === block.correctIndex;

  return (
    <div className={`mcq-view ${checked ? (correct ? "correct" : "incorrect") : ""}`}>
      <p className="mcq-question">{block.question}</p>
      {block.options.map((option, i) => (
        <label key={i} className={`mcq-choice ${checked && i === block.correctIndex ? "reveal-correct" : ""}`}>
          <input
            type="radio"
            name={`view-${block.id}`}
            checked={selected === i}
            disabled={checked}
            onChange={() => setSelected(i)}
          />
          <span>{option}</span>
        </label>
      ))}
      {!checked ? (
        <button
          className="mcq-check"
          disabled={selected === null}
          onClick={() => setChecked(true)}
        >
          Check answer
        </button>
      ) : (
        <div className="mcq-result">
          <p className="mcq-verdict">{correct ? "✓ Correct" : "✗ Not quite"}</p>
          {block.feedback && <p className="mcq-feedback">{block.feedback}</p>}
          <button
            className="mcq-retry"
            onClick={() => {
              setChecked(false);
              setSelected(null);
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "paragraph":
      return block.html ? (
        <RichText html={block.html} className="view-paragraph" />
      ) : (
        <p className="view-paragraph">{block.text}</p>
      );
    case "callout":
      return (
        <div className={`callout-view ${block.variant}`}>
          <span className="callout-icon">
            {block.variant === "warning" ? "⚠" : block.variant === "tip" ? "💡" : "ℹ"}
          </span>
          <RichText html={block.html} />
        </div>
      );
    case "accordion":
      return <AccordionView block={block} />;
    case "tabs":
      return <TabsView block={block} />;
    case "flashcards":
      return <FlashcardsView block={block} />;
    case "video": {
      const embed = block.url ? parseVideoUrl(block.url) : null;
      if (!embed) return null;
      return (
        <figure className="view-figure">
          {embed.kind === "iframe" ? (
            <div className="video-frame">
              <iframe src={embed.src} title={block.caption || "Video"} allowFullScreen />
            </div>
          ) : (
            <video className="video-file" src={embed.src} controls />
          )}
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    }
    case "heading":
      return block.level === 2 ? (
        <h2 className="view-heading">{block.text}</h2>
      ) : (
        <h3 className="view-heading">{block.text}</h3>
      );
    case "list":
      return block.style === "number" ? (
        <ol className="view-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="view-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "divider":
      return <hr className="divider-block" />;
    case "image":
      return block.url ? (
        <figure className="view-figure">
          <img src={block.url} alt={block.alt} className="image-preview" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      ) : null;
    case "mcq":
      return <McqView block={block} />;
  }
}

export function BlocksView({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blocks-view">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}
