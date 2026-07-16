import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { aiPost } from "./lib/api";
import { newBlock } from "./types";
import type { Block, BlockType } from "./types";
import { BlockEditor } from "./BlockEditor";
import { BlocksView } from "./BlockView";

const REGENERATABLE: BlockType[] = ["paragraph", "heading", "list", "mcq", "callout", "quote"];

interface Props {
  lessonId: string;
  onBack: () => void;
}

const BLOCK_MENU: { type: BlockType; label: string; init?: (b: Block) => Block }[] = [
  { type: "paragraph", label: "+ Paragraph" },
  { type: "heading", label: "+ Heading" },
  { type: "list", label: "+ List" },
  { type: "image", label: "+ Image" },
  { type: "video", label: "+ Video" },
  { type: "quote", label: "+ Quote" },
  { type: "statement", label: "+ Statement" },
  { type: "table", label: "+ Table" },
  { type: "columns", label: "+ Two columns" },
  { type: "button", label: "+ Button" },
  { type: "callout", label: "+ Callout" },
  { type: "accordion", label: "+ Accordion" },
  { type: "tabs", label: "+ Tabs" },
  { type: "flashcards", label: "+ Flashcards" },
  { type: "divider", label: "+ Divider" },
  { type: "mcq", label: "+ Quiz question" },
  {
    type: "mcq",
    label: "+ True / False",
    init: (b) =>
      b.type === "mcq" ? { ...b, options: ["True", "False"] } : b,
  },
];

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function LessonEditor({ lessonId, onBack }: Props) {
  const [heading, setHeading] = useState("");
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [courseCtx, setCourseCtx] = useState({ courseTitle: "", topic: "" });
  const [lessonBody, setLessonBody] = useState("");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ heading: string; blocks: Block[] } | null>(null);

  useEffect(() => {
    supabase
      .from("lessons")
      .select("heading, body, blocks, courses(title, topic)")
      .eq("id", lessonId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(`Failed to load lesson: ${error.message}`);
          return;
        }
        setHeading(data.heading);
        setLessonBody(data.body);
        const course = data.courses as unknown as { title: string; topic: string } | null;
        if (course) setCourseCtx({ courseTitle: course.title, topic: course.topic });
        // Seed legacy body text as the first paragraph block
        const existing = data.blocks as Block[];
        if (existing.length === 0 && data.body) {
          setBlocks([{ id: crypto.randomUUID(), type: "paragraph", text: data.body }]);
          setSaveState("dirty");
        } else {
          setBlocks(existing);
        }
      });
  }, [lessonId]);

  const persist = useCallback(async () => {
    if (!latest.current) return;
    setSaveState("saving");
    const { error } = await supabase
      .from("lessons")
      .update({
        heading: latest.current.heading,
        blocks: latest.current.blocks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId);
    if (error) {
      setSaveState("error");
      setError(`Autosave failed: ${error.message}`);
    } else {
      setSaveState("saved");
      setError(null);
    }
  }, [lessonId]);

  // Debounced autosave: 1.2s after the last change
  useEffect(() => {
    if (blocks === null) return;
    latest.current = { heading, blocks };
    if (saveState === "idle") return; // initial load, nothing changed yet
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heading, blocks]);

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        persist();
      }
    };
  }, [persist]);

  function markDirty() {
    setSaveState((s) => (s === "saving" ? s : "dirty"));
  }

  function updateBlock(id: string, next: Block) {
    setBlocks((bs) => bs!.map((b) => (b.id === id ? next : b)));
    markDirty();
  }

  function deleteBlock(id: string) {
    setBlocks((bs) => bs!.filter((b) => b.id !== id));
    markDirty();
  }

  function addBlock(type: BlockType, init?: (b: Block) => Block) {
    const block = newBlock(type);
    setBlocks((bs) => [...bs!, init ? init(block) : block]);
    markDirty();
  }

  function moveBlock(from: number, to: number) {
    setBlocks((bs) => {
      if (to < 0 || to >= bs!.length || from === to) return bs;
      const next = [...bs!];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    markDirty();
  }

  async function draftLesson() {
    if (
      blocks &&
      blocks.length > 0 &&
      !window.confirm("Replace the current blocks with an AI-drafted lesson?")
    )
      return;
    setAiBusy("draft");
    setError(null);
    try {
      const res = await aiPost<{ blocks: Block[] }>("/api/lesson-content", {
        ...courseCtx,
        lessonHeading: heading,
        lessonBody,
      });
      setBlocks(res.blocks);
      markDirty();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(null);
    }
  }

  async function addQuiz() {
    setAiBusy("quiz");
    setError(null);
    try {
      const contentSummary = (blocks ?? [])
        .map((b) =>
          b.type === "paragraph" || b.type === "heading"
            ? b.text
            : b.type === "list"
              ? b.items.join("; ")
              : "",
        )
        .filter(Boolean)
        .join("\n")
        .slice(0, 6000);
      const res = await aiPost<{ blocks: Block[] }>("/api/quiz", {
        ...courseCtx,
        lessonHeading: heading,
        lessonBody,
        contentSummary,
      });
      setBlocks((bs) => [...(bs ?? []), ...res.blocks]);
      markDirty();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(null);
    }
  }

  async function regenerateBlock(block: Block) {
    setAiBusy(block.id);
    setError(null);
    try {
      const { id, ...rest } = block;
      const res = await aiPost<{ block: Block }>("/api/block", {
        ...courseCtx,
        lessonHeading: heading,
        block: rest,
      });
      updateBlock(id, { ...res.block, id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(null);
    }
  }

  const saveLabel = {
    idle: "",
    dirty: "Unsaved changes…",
    saving: "Saving…",
    saved: "All changes saved",
    error: "Save failed",
  }[saveState];

  if (blocks === null && !error) return <p className="message">Loading…</p>;

  return (
    <div>
      <div className="lesson-toolbar">
        <button className="link back" onClick={onBack}>← Back to course</button>
        <div className="toolbar-right">
          <span className={`save-indicator ${saveState}`}>{saveLabel}</span>
          <button className="preview-toggle" onClick={() => setPreviewing((p) => !p)}>
            {previewing ? "✎ Edit" : "▶ Preview"}
          </button>
        </div>
      </div>

      {error && <p className="message error">{error}</p>}

      {blocks !== null && previewing && (
        <div className="lesson-preview">
          <h1 className="view-lesson-heading">{heading}</h1>
          <BlocksView blocks={blocks} />
        </div>
      )}

      {blocks !== null && !previewing && (
        <>
          <input
            className="outline-title"
            value={heading}
            onChange={(e) => {
              setHeading(e.target.value);
              markDirty();
            }}
            placeholder="Lesson heading"
          />

          <div className="ai-toolbar">
            <button onClick={draftLesson} disabled={aiBusy !== null || !heading.trim()}>
              {aiBusy === "draft" ? "Drafting…" : "✨ Draft lesson with AI"}
            </button>
            <button onClick={addQuiz} disabled={aiBusy !== null || !heading.trim()}>
              {aiBusy === "quiz" ? "Writing quiz…" : "✨ Add AI quiz"}
            </button>
          </div>

          {blocks.length === 0 && (
            <p className="message">Empty lesson — draft it with AI above or add your first block below.</p>
          )}

          {blocks.map((block, i) => (
            <div
              key={block.id}
              className={`block draggable ${dragIndex === i ? "dragging" : ""}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) moveBlock(dragIndex, i);
                setDragIndex(null);
              }}
            >
              <div className="block-controls">
                <span className="drag-handle" title="Drag to reorder">⠿</span>
                <span className="block-type">{block.type}</span>
                {REGENERATABLE.includes(block.type) && (
                  <button
                    onClick={() => regenerateBlock(block)}
                    disabled={aiBusy !== null}
                    title="Regenerate this block with AI"
                  >
                    {aiBusy === block.id ? "…" : "↻"}
                  </button>
                )}
                <button onClick={() => moveBlock(i, i - 1)} disabled={i === 0} title="Move up">↑</button>
                <button onClick={() => moveBlock(i, i + 1)} disabled={i === blocks.length - 1} title="Move down">↓</button>
                <button onClick={() => deleteBlock(block.id)} title="Delete block">✕</button>
              </div>
              <BlockEditor block={block} onChange={(next) => updateBlock(block.id, next)} />
            </div>
          ))}

          <div className="block-menu">
            {BLOCK_MENU.map((item) => (
              <button key={item.label} className="add-block" onClick={() => addBlock(item.type, item.init)}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
