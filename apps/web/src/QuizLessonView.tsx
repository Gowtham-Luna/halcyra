import { useMemo, useState } from "react";
import type { Block, QuizQuestionBlock, QuizSettings } from "./types";
import { isQuizQuestion, shuffleArray, gradeQuizQuestion } from "./types";
import { BlockView } from "./BlockView";
import { getLabels } from "./i18n";
import type { UiLabels } from "./i18n";

// Graded quiz lesson: unlike the standalone mcq/multiResponse/fillBlank/
// matching views (instant per-question check), a quiz lesson collects every
// answer and grades them together on submit, against a pass mark, with an
// optional retry limit. Non-question blocks render normally as content.

type Answer = number | Set<number> | string[] | (string | null)[] | undefined;

function initAnswer(block: QuizQuestionBlock): Answer {
  switch (block.type) {
    case "mcq":
      return undefined;
    case "multiResponse":
      return new Set<number>();
    case "fillBlank":
      return Array(block.answers.length).fill("");
    case "matching":
      return block.pairs.map(() => null);
  }
}

function isAnswered(block: QuizQuestionBlock, answer: Answer): boolean {
  switch (block.type) {
    case "mcq":
      return typeof answer === "number";
    case "multiResponse":
      return answer instanceof Set && answer.size > 0;
    case "fillBlank":
      return Array.isArray(answer) && (answer as string[]).every((v) => v.trim().length > 0);
    case "matching":
      return Array.isArray(answer) && (answer as (string | null)[]).every((v) => v !== null);
  }
}

function QuizQuestionInput({
  block,
  answer,
  onChange,
  disabled,
  correct,
}: {
  block: QuizQuestionBlock;
  answer: Answer;
  onChange: (next: Answer) => void;
  disabled: boolean;
  correct: boolean | null;
}) {
  const rightOptions = useMemo(
    () => (block.type === "matching" ? shuffleArray(block.pairs.map((p) => p.right)) : []),
    [block],
  );

  return (
    <div className={`quiz-question ${correct === null ? "" : correct ? "correct" : "incorrect"}`}>
      {block.type === "mcq" && (
        <>
          <p className="mcq-question">{block.question}</p>
          {block.options.map((option, i) => (
            <label
              key={i}
              className={`mcq-choice ${correct !== null && i === block.correctIndex ? "reveal-correct" : ""}`}
            >
              <input
                type="radio"
                name={`quiz-${block.id}`}
                checked={answer === i}
                disabled={disabled}
                onChange={() => onChange(i)}
              />
              <span>{option}</span>
            </label>
          ))}
        </>
      )}
      {block.type === "multiResponse" && (
        <>
          <p className="mcq-question">{block.question}</p>
          {block.options.map((option, i) => {
            const set = answer instanceof Set ? answer : new Set<number>();
            return (
              <label
                key={i}
                className={`mcq-choice ${correct !== null && block.correctIndexes.includes(i) ? "reveal-correct" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={set.has(i)}
                  disabled={disabled}
                  onChange={() => {
                    const next = new Set(set);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    onChange(next);
                  }}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </>
      )}
      {block.type === "fillBlank" && (
        <p className="mcq-question fill-blank-sentence">
          {block.template.split("___").map((part, i, parts) => {
            const values = Array.isArray(answer) ? (answer as string[]) : [];
            return (
              <span key={i}>
                {part}
                {i < parts.length - 1 && (
                  <input
                    className="fill-blank-input"
                    value={values[i] ?? ""}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = [...values];
                      next[i] = e.target.value;
                      onChange(next);
                    }}
                    aria-label={`Blank ${i + 1}`}
                  />
                )}
              </span>
            );
          })}
        </p>
      )}
      {block.type === "matching" &&
        block.pairs.map((pair, i) => {
          const selected = Array.isArray(answer) ? (answer as (string | null)[]) : [];
          return (
            <div className="matching-row" key={i}>
              <span className="matching-left">{pair.left}</span>
              <select
                value={selected[i] ?? ""}
                disabled={disabled}
                onChange={(e) => {
                  const next = [...selected];
                  next[i] = e.target.value || null;
                  onChange(next);
                }}
              >
                <option value="">Select a match…</option>
                {rightOptions.map((opt, j) => (
                  <option key={j} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {correct !== null && (
                <span className={selected[i] === pair.right ? "matching-correct" : "matching-incorrect"}>
                  {selected[i] === pair.right ? "✓" : `✗ ${pair.right}`}
                </span>
              )}
            </div>
          );
        })}
      {correct !== null && block.feedback && <p className="mcq-feedback">{block.feedback}</p>}
    </div>
  );
}

export function QuizLessonRunner({
  blocks,
  settings,
  labels,
  onResult,
  onContinue,
}: {
  blocks: Block[];
  settings: QuizSettings;
  labels?: UiLabels;
  onResult: (score: number, passed: boolean) => void;
  onContinue: () => void;
}) {
  const t = labels ?? getLabels(undefined);
  const [attempt, setAttempt] = useState(1);

  const orderedBlocks = useMemo(() => {
    if (!settings.shuffle) return blocks;
    const questionIndexes = blocks.map((_, i) => i).filter((i) => isQuizQuestion(blocks[i]));
    const shuffledQuestions = shuffleArray(questionIndexes.map((i) => blocks[i]));
    let qi = 0;
    return blocks.map((b) => (isQuizQuestion(b) ? shuffledQuestions[qi++] : b));
    // Re-shuffle only when the underlying lesson content changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // Question bank: if drawCount is set below the pool size, draw a fresh
  // random subset each attempt (retry) rather than always using every question.
  const drawnBlocks = useMemo(() => {
    const drawCount = settings.drawCount ?? 0;
    const questionIndexes = orderedBlocks.map((_, i) => i).filter((i) => isQuizQuestion(orderedBlocks[i]));
    if (drawCount <= 0 || drawCount >= questionIndexes.length) return orderedBlocks;
    const chosen = new Set(shuffleArray(questionIndexes).slice(0, drawCount));
    return orderedBlocks.filter((b, i) => !isQuizQuestion(b) || chosen.has(i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedBlocks, settings.drawCount, attempt]);

  const questions = useMemo(
    () => drawnBlocks.filter(isQuizQuestion),
    [drawnBlocks],
  );

  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, initAnswer(q)])),
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  if (questions.length === 0) {
    return (
      <div>
        {drawnBlocks.map((b) => (
          <BlockView key={b.id} block={b} />
        ))}
        <p className="message">This quiz lesson has no questions yet.</p>
      </div>
    );
  }

  const passed = score !== null && score >= settings.passMark;
  const attemptsExhausted = settings.maxAttempts > 0 && attempt >= settings.maxAttempts;
  const allAnswered = questions.every((q) => isAnswered(q, answers[q.id]));

  function submit() {
    const correctCount = questions.filter((q) => gradeQuizQuestion(q, answers[q.id])).length;
    const pct = Math.round((correctCount / questions.length) * 100);
    setScore(pct);
    setSubmitted(true);
    onResult(pct, pct >= settings.passMark);
  }

  function retry() {
    setAnswers(Object.fromEntries(questions.map((q) => [q.id, initAnswer(q)])));
    setSubmitted(false);
    setScore(null);
    setAttempt((a) => a + 1);
  }

  return (
    <div className="quiz-lesson">
      {drawnBlocks.map((b) =>
        isQuizQuestion(b) ? (
          <QuizQuestionInput
            key={b.id}
            block={b}
            answer={answers[b.id]}
            disabled={submitted}
            correct={submitted ? gradeQuizQuestion(b, answers[b.id]) : null}
            onChange={(next) => setAnswers((s) => ({ ...s, [b.id]: next }))}
          />
        ) : (
          <BlockView key={b.id} block={b} />
        ),
      )}
      {!submitted ? (
        <button className="quiz-submit" onClick={submit} disabled={!allAnswered}>
          {t.submitQuiz}
        </button>
      ) : (
        <div className={`quiz-result-banner ${passed ? "passed" : "failed"}`}>
          <p className="quiz-result-score">
            {passed ? t.passed : t.notPassed} — {score}% ({t.passMark} {settings.passMark}%)
          </p>
          {!passed && !attemptsExhausted && (
            <button className="quiz-retry" onClick={retry}>
              {t.retryQuiz}
              {settings.maxAttempts > 0 ? ` (${settings.maxAttempts - attempt} left)` : ""}
            </button>
          )}
          {(passed || attemptsExhausted) && (
            <button className="quiz-continue player-continue" onClick={onContinue}>
              {!passed && attemptsExhausted ? t.continueAnyway : t.continue}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
