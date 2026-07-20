import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "./lib/supabase";
import { aiPost } from "./lib/api";
import { newBlock, DEFAULT_QUIZ_SETTINGS, DEFAULT_THEME, themeStyleVars } from "./types";
import type { Block, BlockType, QuizSettings, CourseTheme } from "./types";
import { BlockEditor } from "./BlockEditor";
import { BlocksView } from "./BlockView";
import { QuizLessonRunner } from "./QuizLessonView";

const REGENERATABLE: BlockType[] = [
  "paragraph",
  "heading",
  "list",
  "mcq",
  "multiResponse",
  "fillBlank",
  "callout",
  "quote",
];

const TONE_PRESETS: { label: string; instruction: string }[] = [
  { label: "↻ Regenerate…", instruction: "" },
  { label: "Clearer & more engaging", instruction: "Rewrite it to be clearer and more engaging." },
  { label: "More concise", instruction: "Rewrite it to be significantly more concise, cutting unnecessary words." },
  { label: "More formal", instruction: "Rewrite it in a more formal, professional tone." },
  { label: "More casual", instruction: "Rewrite it in a warmer, more casual, conversational tone." },
  { label: "Simpler language", instruction: "Rewrite it using simpler, plain language for a general audience." },
];

interface Props {
  lessonId: string;
  onBack: () => void;
}

const BLOCK_MENU: { type: BlockType; label: string; init?: (b: Block) => Block }[] = [
  { type: "paragraph", label: "+ Paragraph" },
  { type: "heading", label: "+ Heading" },
  { type: "list", label: "+ List" },
  { type: "image", label: "+ Image" },
  { type: "imageText", label: "+ Image & text" },
  { type: "gallery", label: "+ Gallery" },
  { type: "video", label: "+ Video" },
  { type: "audio", label: "+ Audio" },
  { type: "embed", label: "+ Embed" },
  { type: "attachment", label: "+ Attachment" },
  { type: "quote", label: "+ Quote" },
  { type: "statement", label: "+ Statement" },
  { type: "table", label: "+ Table" },
  { type: "columns", label: "+ Two columns" },
  { type: "button", label: "+ Button" },
  { type: "callout", label: "+ Callout" },
  { type: "accordion", label: "+ Accordion" },
  { type: "tabs", label: "+ Tabs" },
  { type: "flashcards", label: "+ Flashcards" },
  { type: "labeledGraphic", label: "+ Labeled graphic" },
  { type: "process", label: "+ Process" },
  { type: "timeline", label: "+ Timeline" },
  { type: "sorting", label: "+ Sorting activity" },
  { type: "chart", label: "+ Chart" },
  { type: "scenario", label: "+ Scenario" },
  { type: "divider", label: "+ Divider" },
  { type: "mcq", label: "+ Quiz question" },
  { type: "multiResponse", label: "+ Multiple response" },
  { type: "fillBlank", label: "+ Fill in the blank" },
  { type: "matching", label: "+ Matching" },
  {
    type: "mcq",
    label: "+ True / False",
    init: (b) =>
      b.type === "mcq" ? { ...b, options: ["True", "False"] } : b,
  },
];

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
interface BlockTemplate {
  id: string;
  name: string;
  block: Block;
}

export function LessonEditor({ lessonId, onBack }: Props) {
  const [heading, setHeading] = useState("");
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [courseCtx, setCourseCtx] = useState({ courseTitle: "", topic: "" });
  const [theme, setTheme] = useState<CourseTheme>(DEFAULT_THEME);
  const [lessonBody, setLessonBody] = useState("");
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [quizSettings, setQuizSettings] = useState<QuizSettings>(DEFAULT_QUIZ_SETTINGS);
  const [templates, setTemplates] = useState<BlockTemplate[]>([]);
  const [otherEditors, setOtherEditors] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ heading: string; blocks: Block[]; quizSettings: QuizSettings } | null>(
    null,
  );

  // Undo/redo: debounced snapshots of `blocks` (rapid edits like typing
  // coalesce into one step, same debounce window as autosave) rather than
  // one entry per keystroke/action — a lite history, not per-action granularity.
  const history = useRef<Block[][]>([]);
  const historyIndex = useRef(-1);
  const isApplyingHistory = useRef(false);
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  function pushHistory(snapshot: Block[]) {
    history.current = history.current.slice(0, historyIndex.current + 1);
    history.current.push(snapshot);
    if (history.current.length > 50) history.current.shift();
    historyIndex.current = history.current.length - 1;
    setCanUndo(historyIndex.current > 0);
    setCanRedo(false);
  }

  function undo() {
    if (historyIndex.current <= 0) return;
    historyIndex.current--;
    isApplyingHistory.current = true;
    setBlocks(history.current[historyIndex.current]);
    setCanUndo(historyIndex.current > 0);
    setCanRedo(true);
    markDirty();
  }

  function redo() {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current++;
    isApplyingHistory.current = true;
    setBlocks(history.current[historyIndex.current]);
    setCanUndo(true);
    setCanRedo(historyIndex.current < history.current.length - 1);
    markDirty();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    supabase
      .from("lessons")
      .select("heading, body, blocks, quiz_settings, courses(title, topic, theme)")
      .eq("id", lessonId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(`Failed to load lesson: ${error.message}`);
          return;
        }
        setHeading(data.heading);
        setLessonBody(data.body);
        setQuizSettings(data.quiz_settings ?? DEFAULT_QUIZ_SETTINGS);
        const course = data.courses as unknown as
          | { title: string; topic: string; theme: CourseTheme | null }
          | null;
        if (course) {
          setCourseCtx({ courseTitle: course.title, topic: course.topic });
          setTheme({ ...DEFAULT_THEME, ...(course.theme ?? {}) });
        }
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

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lightweight co-editing: presence-only awareness (who else has this lesson
  // open right now), not real-time conflict-free merging — the underlying
  // problem (concurrent rich-text edits) needs OT/CRDT to solve properly,
  // which is a much bigger effort than this pass. Last write still wins;
  // this just warns editors of each other instead of silently clobbering.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    async function setupPresence() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || cancelled) return;
      channel = supabase.channel(`lesson-presence-${lessonId}`, {
        config: { presence: { key: user.id } },
      });
      channel.on("presence", { event: "sync" }, () => {
        const state = channel!.presenceState<{ email: string }>();
        const others = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .map(([, metas]) => metas[0]?.email)
          .filter((e): e is string => !!e);
        setOtherEditors(others);
      });
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && channel) {
          await channel.track({ email: user.email ?? "Someone" });
        }
      });
    }
    setupPresence();
    return () => {
      cancelled = true;
      setOtherEditors([]);
      if (channel) supabase.removeChannel(channel);
    };
  }, [lessonId]);

  const persist = useCallback(async () => {
    if (!latest.current) return;
    setSaveState("saving");
    const { error } = await supabase
      .from("lessons")
      .update({
        heading: latest.current.heading,
        blocks: latest.current.blocks,
        quiz_settings: latest.current.quizSettings.enabled ? latest.current.quizSettings : null,
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
    latest.current = { heading, blocks, quizSettings };
    if (saveState === "idle") return; // initial load, nothing changed yet
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heading, blocks, quizSettings]);

  // Debounced undo/redo history snapshot (see refs above for why debounced)
  useEffect(() => {
    if (blocks === null) return;
    if (isApplyingHistory.current) {
      isApplyingHistory.current = false;
      return;
    }
    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => pushHistory(blocks), 800);
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

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

  async function saveAsTemplate(block: Block) {
    const name = window.prompt("Template name", `${block.type} template`);
    if (!name?.trim()) return;
    const { id, ...rest } = block;
    void id;
    const { error } = await supabase.from("block_templates").insert({ name: name.trim(), block: rest });
    if (error) setError(`Save template failed: ${error.message}`);
    else await loadTemplates();
  }

  function insertTemplate(template: BlockTemplate) {
    setBlocks((bs) => [...bs!, { ...template.block, id: crypto.randomUUID() }]);
    markDirty();
  }

  async function loadTemplates() {
    const { data, error } = await supabase
      .from("block_templates")
      .select("id, name, block")
      .order("created_at", { ascending: false });
    if (!error) setTemplates(data as BlockTemplate[]);
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
      const res = await aiPost<{ blocks: Block[] }>("/api/quiz", {
        ...courseCtx,
        lessonHeading: heading,
        lessonBody,
        contentSummary: contentSummaryText(),
      });
      setBlocks((bs) => [...(bs ?? []), ...res.blocks]);
      markDirty();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(null);
    }
  }

  async function regenerateBlock(block: Block, instruction?: string) {
    setAiBusy(block.id);
    setError(null);
    try {
      const { id, ...rest } = block;
      const res = await aiPost<{ block: Block }>("/api/block", {
        ...courseCtx,
        lessonHeading: heading,
        block: rest,
        instruction: instruction ?? "",
      });
      updateBlock(id, { ...res.block, id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiBusy(null);
    }
  }

  function contentSummaryText(): string {
    return (blocks ?? [])
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
  }

  async function addSummary() {
    setAiBusy("summary");
    setError(null);
    try {
      const res = await aiPost<{ blocks: Block[] }>("/api/summary", {
        ...courseCtx,
        lessonHeading: heading,
        lessonBody,
        contentSummary: contentSummaryText(),
      });
      setBlocks((bs) => [...(bs ?? []), ...res.blocks]);
      markDirty();
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
          <button className="preview-toggle" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
            ↶
          </button>
          <button className="preview-toggle" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            ↷
          </button>
          <span className={`save-indicator ${saveState}`}>{saveLabel}</span>
          <button className="preview-toggle" onClick={() => setPreviewing((p) => !p)}>
            {previewing ? "✎ Edit" : "▶ Preview"}
          </button>
        </div>
      </div>

      {error && <p className="message error">{error}</p>}

      {otherEditors.length > 0 && (
        <p className="message co-editing-warning">
          👀 Also editing right now: {otherEditors.join(", ")} — changes save independently, so the last save wins
          if you edit the same block.
        </p>
      )}

      {blocks !== null && previewing && (
        <div className="lesson-preview" style={themeStyleVars(theme) as CSSProperties}>
          <h1 className="view-lesson-heading">{heading}</h1>
          {quizSettings.enabled ? (
            <QuizLessonRunner
              blocks={blocks}
              settings={quizSettings}
              onResult={() => {}}
              onContinue={() => {}}
            />
          ) : (
            <BlocksView blocks={blocks} />
          )}
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

          <div className="quiz-settings-panel">
            <label className="quiz-settings-toggle">
              <input
                type="checkbox"
                checked={quizSettings.enabled}
                onChange={(e) => {
                  setQuizSettings((s) => ({ ...s, enabled: e.target.checked }));
                  markDirty();
                }}
              />
              Graded quiz lesson (score gates progress by pass mark)
            </label>
            {quizSettings.enabled && (
              <div className="quiz-settings-fields">
                <label>
                  Pass mark
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={quizSettings.passMark}
                    onChange={(e) => {
                      setQuizSettings((s) => ({ ...s, passMark: Number(e.target.value) || 0 }));
                      markDirty();
                    }}
                  />
                  %
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={quizSettings.shuffle}
                    onChange={(e) => {
                      setQuizSettings((s) => ({ ...s, shuffle: e.target.checked }));
                      markDirty();
                    }}
                  />
                  Shuffle questions
                </label>
                <label>
                  Max attempts
                  <input
                    type="number"
                    min={0}
                    value={quizSettings.maxAttempts}
                    onChange={(e) => {
                      setQuizSettings((s) => ({ ...s, maxAttempts: Number(e.target.value) || 0 }));
                      markDirty();
                    }}
                  />
                  (0 = unlimited)
                </label>
                <label>
                  Draw from bank
                  <input
                    type="number"
                    min={0}
                    value={quizSettings.drawCount ?? 0}
                    onChange={(e) => {
                      setQuizSettings((s) => ({ ...s, drawCount: Number(e.target.value) || 0 }));
                      markDirty();
                    }}
                  />
                  (0 = use every question; otherwise draw this many at random each attempt)
                </label>
              </div>
            )}
          </div>

          <div className="ai-toolbar">
            <button onClick={draftLesson} disabled={aiBusy !== null || !heading.trim()}>
              {aiBusy === "draft" ? "Drafting…" : "✨ Draft lesson with AI"}
            </button>
            <button onClick={addQuiz} disabled={aiBusy !== null || !heading.trim()}>
              {aiBusy === "quiz" ? "Writing quiz…" : "✨ Add AI quiz"}
            </button>
            <button onClick={addSummary} disabled={aiBusy !== null || !heading.trim()}>
              {aiBusy === "summary" ? "Summarizing…" : "✨ Summarize"}
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
                  <select
                    className="tone-select"
                    aria-label="Regenerate this block with AI"
                    disabled={aiBusy !== null}
                    value={0}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      e.target.value = "0";
                      if (idx > 0) regenerateBlock(block, TONE_PRESETS[idx].instruction);
                    }}
                  >
                    {TONE_PRESETS.map((t, i) => (
                      <option key={t.label} value={i}>
                        {aiBusy === block.id && i === 0 ? "…" : t.label}
                      </option>
                    ))}
                  </select>
                )}
                <button onClick={() => moveBlock(i, i - 1)} disabled={i === 0} title="Move up">↑</button>
                <button onClick={() => moveBlock(i, i + 1)} disabled={i === blocks.length - 1} title="Move down">↓</button>
                <button onClick={() => saveAsTemplate(block)} title="Save as reusable template" aria-label="Save as template">
                  💾
                </button>
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
            {templates.length > 0 && (
              <select
                className="tone-select"
                aria-label="Insert a saved template"
                value={0}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  e.target.value = "0";
                  if (idx > 0) insertTemplate(templates[idx - 1]);
                }}
              >
                <option value={0}>📋 Insert template…</option>
                {templates.map((tpl, i) => (
                  <option key={tpl.id} value={i + 1}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}
    </div>
  );
}
