import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import type { Block } from "./types";
import { parseVideoUrl, countBlanks, shuffleArray } from "./types";

// Author-produced HTML rendered to learners (who may be strangers via share
// links) — always sanitize.
function RichText({
  html,
  className,
  id,
  role,
}: {
  html: string;
  className?: string;
  id?: string;
  role?: string;
}) {
  return (
    <div
      id={id}
      role={role}
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
            aria-expanded={open.has(i)}
            aria-controls={`accordion-body-${block.id}-${i}`}
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
            <span aria-hidden="true">{open.has(i) ? "−" : "+"}</span>
          </button>
          {open.has(i) && (
            <RichText html={item.html} className="accordion-body" id={`accordion-body-${block.id}-${i}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function TabsView({ block }: { block: Extract<Block, { type: "tabs" }> }) {
  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, block.tabs.length - 1);
  const tab = block.tabs[activeIndex];
  return (
    <div className="tabs-view">
      <div className="tabs-bar" role="tablist">
        {block.tabs.map((t, i) => (
          <button
            key={i}
            className={`tab-title ${i === activeIndex ? "active" : ""}`}
            role="tab"
            aria-selected={i === activeIndex}
            aria-controls={`tab-panel-${block.id}-${i}`}
            onClick={() => setActive(i)}
          >
            {t.title}
          </button>
        ))}
      </div>
      {tab && (
        <RichText
          html={tab.html}
          className="tab-body"
          id={`tab-panel-${block.id}-${activeIndex}`}
          role="tabpanel"
        />
      )}
    </div>
  );
}

function FlashcardsView({ block }: { block: Extract<Block, { type: "flashcards" }> }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  return (
    <div className="flashcards-view">
      {block.cards.map((card, i) => {
        const isFlipped = flipped.has(i);
        const image = isFlipped ? card.backImage : card.frontImage;
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
            {image && <img src={image} alt="" className="flashcard-image" />}
            <span className="flashcard-side-label">{isFlipped ? "Back" : "Front"}</span>
            <span className="flashcard-text">{isFlipped ? card.back : card.front}</span>
          </button>
        );
      })}
    </div>
  );
}

function GalleryView({ block }: { block: Extract<Block, { type: "gallery" }> }) {
  const [index, setIndex] = useState(0);
  const items = block.items.filter((item) => item.url);
  if (items.length === 0) return null;

  if (block.layout === "carousel") {
    const current = items[Math.min(index, items.length - 1)];
    return (
      <div className="gallery-carousel">
        <figure className="view-figure">
          <img src={current.url} alt={current.alt} className="image-preview" />
          {current.caption && <figcaption>{current.caption}</figcaption>}
        </figure>
        {items.length > 1 && (
          <div className="gallery-nav">
            <button onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)} aria-label="Previous image">‹</button>
            <span className="gallery-count">{index + 1} / {items.length}</span>
            <button onClick={() => setIndex((i) => (i + 1) % items.length)} aria-label="Next image">›</button>
          </div>
        )}
      </div>
    );
  }

  const cols = block.layout === "grid3" ? 3 : block.layout === "grid4" ? 4 : 2;
  return (
    <div className={`gallery-grid gallery-grid-${cols}`}>
      {items.map((item, i) => (
        <figure className="view-figure" key={i}>
          <img src={item.url} alt={item.alt} className="image-preview" />
          {item.caption && <figcaption>{item.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

function LabeledGraphicView({ block }: { block: Extract<Block, { type: "labeledGraphic" }> }) {
  const [active, setActive] = useState<number | null>(null);
  if (!block.url) return null;
  return (
    <div className="labeled-graphic-view">
      <img src={block.url} alt={block.alt} className="image-preview" />
      {block.markers.map((m, i) => (
        <span key={i} className="marker-wrap" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
          <button
            className={`marker-pin ${active === i ? "active" : ""}`}
            onClick={() => setActive((a) => (a === i ? null : i))}
            aria-expanded={active === i}
            aria-label={m.title}
          >
            {i + 1}
          </button>
          {active === i && (
            <span className="marker-popup">
              <strong>{m.title}</strong>
              {m.html && <RichText html={m.html} />}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function ProcessView({ block }: { block: Extract<Block, { type: "process" }> }) {
  return (
    <ol className="process-view">
      {block.steps.map((step, i) => (
        <li key={i} className="process-step">
          <span className="process-number">{i + 1}</span>
          <div className="process-body">
            <p className="process-title">{step.title}</p>
            <RichText html={step.html} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function TimelineView({ block }: { block: Extract<Block, { type: "timeline" }> }) {
  return (
    <ol className="timeline-view">
      {block.items.map((item, i) => (
        <li key={i} className="timeline-item">
          {item.label && <span className="timeline-label">{item.label}</span>}
          <p className="timeline-title">{item.title}</p>
          <RichText html={item.html} />
        </li>
      ))}
    </ol>
  );
}

function SortingView({ block }: { block: Extract<Block, { type: "sorting" }> }) {
  const [selected, setSelected] = useState<(number | null)[]>(() => block.items.map(() => null));
  const [checked, setChecked] = useState(false);
  const correct = checked && block.items.every((item, i) => selected[i] === item.category);

  return (
    <div className={`mcq-view ${checked ? (correct ? "correct" : "incorrect") : ""}`}>
      {block.items.map((item, i) => (
        <div className="matching-row" key={i}>
          <span className="matching-left">{item.text}</span>
          <select
            value={selected[i] ?? ""}
            disabled={checked}
            onChange={(e) => {
              const next = [...selected];
              next[i] = e.target.value === "" ? null : Number(e.target.value);
              setSelected(next);
            }}
          >
            <option value="">Select a category…</option>
            {block.categories.map((cat, ci) => (
              <option key={ci} value={ci}>
                {cat}
              </option>
            ))}
          </select>
          {checked && (
            <span className={selected[i] === item.category ? "matching-correct" : "matching-incorrect"}>
              {selected[i] === item.category ? "✓" : `✗ ${block.categories[item.category]}`}
            </span>
          )}
        </div>
      ))}
      {!checked ? (
        <button
          className="mcq-check"
          disabled={selected.some((s) => s === null)}
          onClick={() => setChecked(true)}
        >
          Check answer
        </button>
      ) : (
        <div className="mcq-result">
          <p className="mcq-verdict">{correct ? "✓ All correct" : "✗ Not quite"}</p>
          {block.feedback && <p className="mcq-feedback">{block.feedback}</p>}
          <button
            className="mcq-retry"
            onClick={() => {
              setChecked(false);
              setSelected(block.items.map(() => null));
            }}
          >
            Try again
          </button>
        </div>
      )}
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

function MultiResponseView({ block }: { block: Extract<Block, { type: "multiResponse" }> }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);
  const correctSet = new Set(block.correctIndexes);
  const correct =
    checked && selected.size === correctSet.size && [...selected].every((i) => correctSet.has(i));

  return (
    <div className={`mcq-view ${checked ? (correct ? "correct" : "incorrect") : ""}`}>
      <p className="mcq-question">{block.question}</p>
      {block.options.map((option, i) => (
        <label key={i} className={`mcq-choice ${checked && correctSet.has(i) ? "reveal-correct" : ""}`}>
          <input
            type="checkbox"
            checked={selected.has(i)}
            disabled={checked}
            onChange={() =>
              setSelected((s) => {
                const next = new Set(s);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
          />
          <span>{option}</span>
        </label>
      ))}
      {!checked ? (
        <button className="mcq-check" disabled={selected.size === 0} onClick={() => setChecked(true)}>
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
              setSelected(new Set());
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function FillBlankView({ block }: { block: Extract<Block, { type: "fillBlank" }> }) {
  const blanks = countBlanks(block.template);
  const [values, setValues] = useState<string[]>(() => Array(blanks).fill(""));
  const [checked, setChecked] = useState(false);
  const correct =
    checked &&
    block.answers.every((accepted, i) => {
      const given = (values[i] ?? "").trim().toLowerCase();
      return given.length > 0 && accepted.some((a) => a.trim().toLowerCase() === given);
    });
  const parts = block.template.split("___");

  return (
    <div className={`mcq-view fill-blank-view ${checked ? (correct ? "correct" : "incorrect") : ""}`}>
      <p className="mcq-question fill-blank-sentence">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <input
                className="fill-blank-input"
                value={values[i] ?? ""}
                disabled={checked}
                onChange={(e) => {
                  const next = [...values];
                  next[i] = e.target.value;
                  setValues(next);
                }}
                aria-label={`Blank ${i + 1}`}
              />
            )}
          </span>
        ))}
      </p>
      {!checked ? (
        <button
          className="mcq-check"
          disabled={values.some((v) => !v.trim())}
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
              setValues(Array(blanks).fill(""));
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function MatchingView({ block }: { block: Extract<Block, { type: "matching" }> }) {
  const rightOptions = useMemo(() => shuffleArray(block.pairs.map((p) => p.right)), [block.pairs]);
  const [selected, setSelected] = useState<(string | null)[]>(() => block.pairs.map(() => null));
  const [checked, setChecked] = useState(false);
  const correct = checked && block.pairs.every((pair, i) => selected[i] === pair.right);

  return (
    <div className={`mcq-view ${checked ? (correct ? "correct" : "incorrect") : ""}`}>
      {block.pairs.map((pair, i) => (
        <div className="matching-row" key={i}>
          <span className="matching-left">{pair.left}</span>
          <select
            value={selected[i] ?? ""}
            disabled={checked}
            onChange={(e) => {
              const next = [...selected];
              next[i] = e.target.value || null;
              setSelected(next);
            }}
          >
            <option value="">Select a match…</option>
            {rightOptions.map((opt, j) => (
              <option key={j} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {checked && (
            <span className={selected[i] === pair.right ? "matching-correct" : "matching-incorrect"}>
              {selected[i] === pair.right ? "✓" : `✗ ${pair.right}`}
            </span>
          )}
        </div>
      ))}
      {!checked ? (
        <button
          className="mcq-check"
          disabled={selected.some((s) => s === null)}
          onClick={() => setChecked(true)}
        >
          Check answer
        </button>
      ) : (
        <div className="mcq-result">
          <p className="mcq-verdict">{correct ? "✓ All correct" : "✗ Not quite"}</p>
          {block.feedback && <p className="mcq-feedback">{block.feedback}</p>}
          <button
            className="mcq-retry"
            onClick={() => {
              setChecked(false);
              setSelected(block.pairs.map(() => null));
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

const CHART_PALETTE = ["#6c5ce7", "#0984e3", "#00b894", "#e17055", "#d63031", "#fdcb6e"];

function ChartView({ block }: { block: Extract<Block, { type: "chart" }> }) {
  const { chartType, title, labels, series } = block;
  if (labels.length === 0) return null;
  const width = 400;
  const height = 220;
  const padding = 32;
  const max = Math.max(1, ...series);

  return (
    <figure className="view-figure chart-view">
      {title && <figcaption className="chart-title">{title}</figcaption>}
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label={title || "Chart"}>
        {chartType === "bar" &&
          labels.map((label, i) => {
            const barWidth = (width - padding * 2) / labels.length;
            const barHeight = ((series[i] ?? 0) / max) * (height - padding * 2);
            const x = padding + i * barWidth;
            const y = height - padding - barHeight;
            return (
              <g key={i}>
                <rect x={x + barWidth * 0.15} y={y} width={barWidth * 0.7} height={barHeight} className="chart-bar" />
                <text x={x + barWidth / 2} y={height - padding + 16} textAnchor="middle" className="chart-label">
                  {label}
                </text>
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="chart-value">
                  {series[i] ?? 0}
                </text>
              </g>
            );
          })}
        {chartType === "line" &&
          (() => {
            const stepX = (width - padding * 2) / Math.max(1, labels.length - 1);
            const points = series.map((v, i) => {
              const x = padding + i * stepX;
              const y = height - padding - (v / max) * (height - padding * 2);
              return [x, y] as const;
            });
            return (
              <>
                <polyline points={points.map((p) => p.join(",")).join(" ")} className="chart-line" fill="none" />
                {points.map(([x, y], i) => (
                  <g key={i}>
                    <circle cx={x} cy={y} r={3.5} className="chart-dot" />
                    <text x={x} y={height - padding + 16} textAnchor="middle" className="chart-label">
                      {labels[i]}
                    </text>
                  </g>
                ))}
              </>
            );
          })()}
        {chartType === "pie" &&
          (() => {
            const total = series.reduce((a, b) => a + b, 0) || 1;
            let angle = -90;
            const cx = width / 2;
            const cy = height / 2;
            const r = Math.min(width, height) / 2 - padding / 2;
            return series.map((v, i) => {
              const slice = (v / total) * 360;
              const start = (angle * Math.PI) / 180;
              angle += slice;
              const end = (angle * Math.PI) / 180;
              const large = slice > 180 ? 1 : 0;
              const x1 = cx + r * Math.cos(start);
              const y1 = cy + r * Math.sin(start);
              const x2 = cx + r * Math.cos(end);
              const y2 = cy + r * Math.sin(end);
              return (
                <path
                  key={i}
                  d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                  fill={CHART_PALETTE[i % CHART_PALETTE.length]}
                />
              );
            });
          })()}
      </svg>
      {chartType === "pie" && (
        <ul className="chart-legend">
          {labels.map((l, i) => (
            <li key={i}>
              <span className="chart-swatch" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
              {l}: {series[i] ?? 0}
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

function ScenarioView({ block }: { block: Extract<Block, { type: "scenario" }> }) {
  const [currentId, setCurrentId] = useState(block.startNodeId);
  const node = block.nodes.find((n) => n.id === currentId) ?? block.nodes[0];
  const isEnd = !node || node.choices.length === 0;

  if (!node) return null;

  return (
    <div className="scenario-view">
      {node.image && <img src={node.image} alt="" className="scenario-image" />}
      <div className="scenario-dialogue">
        {node.speaker && <p className="scenario-speaker">{node.speaker}</p>}
        <p className="scenario-line">{node.line}</p>
      </div>
      {isEnd ? (
        <div className="scenario-end">
          <p className="scenario-end-label">— End —</p>
          <button onClick={() => setCurrentId(block.startNodeId)}>↺ Start over</button>
        </div>
      ) : (
        <div className="scenario-choices">
          {node.choices.map((choice, i) => (
            <button
              key={i}
              className="scenario-choice"
              onClick={() => choice.nextNodeId && setCurrentId(choice.nextNodeId)}
            >
              {choice.text}
            </button>
          ))}
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
    case "chart":
      return <ChartView block={block} />;
    case "scenario":
      return <ScenarioView block={block} />;
    case "heading":
      return block.level === 2 ? (
        <h2 className="view-heading">{block.text}</h2>
      ) : (
        <h3 className="view-heading">{block.text}</h3>
      );
    case "list":
      if (block.style === "check") return <CheckListView block={block} />;
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
      if (block.style === "spacer") return <div className="spacer-block" />;
      // Revealed "continue" gates render nothing — content simply flows on.
      // (Unrevealed gates never reach BlockView; BlocksView intercepts them.)
      if (block.style === "continue") return null;
      return <hr className="divider-block" />;
    case "quote":
      return (
        <blockquote className="quote-view">
          <p className="quote-text">“{block.text}”</p>
          {(block.cite || block.role) && (
            <footer>
              {block.cite}
              {block.role && <span className="quote-role"> · {block.role}</span>}
            </footer>
          )}
        </blockquote>
      );
    case "statement":
      return <RichText html={block.html} className={`statement-view ${block.variant}`} />;
    case "table":
      return (
        <div className="table-scroll">
          <table className="table-view">
            <thead>
              <tr>
                {block.header.map((h, c) => (
                  <th key={c}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "columns":
      return (
        <div className="columns-view">
          <RichText html={block.leftHtml} />
          <RichText html={block.rightHtml} />
        </div>
      );
    case "button":
      return block.url ? (
        <p className="button-view">
          <a href={block.url} target="_blank" rel="noopener noreferrer" className="button-link">
            {block.label || "Open link"}
          </a>
        </p>
      ) : null;
    case "image":
      return block.url ? (
        <figure className={`view-figure image-style-${block.style ?? "centered"}`}>
          <img src={block.url} alt={block.alt} className="image-preview" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      ) : null;
    case "imageText":
      if (!block.url && !block.html) return null;
      return (
        <div className={`image-text-view image-text-${block.layout}`}>
          {block.url && <img src={block.url} alt={block.alt} className="image-preview" />}
          <RichText html={block.html} />
        </div>
      );
    case "audio":
      return block.url ? (
        <figure className="view-figure">
          <audio src={block.url} controls className="audio-preview" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      ) : null;
    case "embed":
      return block.url ? (
        <div className="embed-frame" style={{ height: block.height }}>
          <iframe
            src={block.url}
            title={block.title || "Embedded content"}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : null;
    case "attachment":
      return block.url ? (
        <p className="button-view">
          <a href={block.url} download={block.filename || undefined} className="button-link attachment-link">
            📎 {block.label || block.filename || "Download"}
          </a>
        </p>
      ) : null;
    case "gallery":
      return <GalleryView block={block} />;
    case "mcq":
      return <McqView block={block} />;
    case "multiResponse":
      return <MultiResponseView block={block} />;
    case "fillBlank":
      return <FillBlankView block={block} />;
    case "matching":
      return <MatchingView block={block} />;
    case "labeledGraphic":
      return <LabeledGraphicView block={block} />;
    case "process":
      return <ProcessView block={block} />;
    case "timeline":
      return <TimelineView block={block} />;
    case "sorting":
      return <SortingView block={block} />;
  }
}

function CheckListView({ block }: { block: Extract<Block, { type: "list" }> }) {
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  return (
    <ul className="view-list checklist">
      {block.items.map((item, i) => (
        <li key={i}>
          <label>
            <input
              type="checkbox"
              checked={ticked.has(i)}
              onChange={() =>
                setTicked((s) => {
                  const next = new Set(s);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
            />
            <span>{item}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export function BlocksView({ blocks }: { blocks: Block[] }) {
  // "Continue" dividers gate everything below them until clicked.
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const gateIndex = blocks.findIndex(
    (b) => b.type === "divider" && b.style === "continue" && !revealed.has(b.id),
  );
  const visible = gateIndex === -1 ? blocks : blocks.slice(0, gateIndex);
  const gate = gateIndex === -1 ? null : blocks[gateIndex];

  return (
    <div className="blocks-view">
      {visible.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
      {gate && (
        <p className="button-view">
          <button
            className="continue-btn"
            onClick={() => setRevealed((s) => new Set(s).add(gate.id))}
          >
            Continue ▾
          </button>
        </p>
      )}
    </div>
  );
}
