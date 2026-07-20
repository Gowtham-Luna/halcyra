// Watches the working tree and auto-commits + pushes to origin/main whenever
// things go quiet for a bit. This repo auto-deploys (Vercel + Render) on
// every push to main, so there is NO human/AI review step between a file
// save and production — the only gate is `npm run typecheck` below. A
// change that doesn't typecheck is never committed; anything that *does*
// typecheck can still ship a real bug straight to prod. Stop this (Ctrl+C)
// before doing anything you don't want auto-pushed.

import { watch } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEBOUNCE_MS = 20_000;
const IGNORE_SEGMENTS = ["node_modules", ".git", "dist", "scorm-player"];

let timer = null;
let running = false;
let pendingWhileRunning = false;

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, stdio: "pipe", encoding: "utf8" });
}

function log(msg) {
  console.log(`[auto-commit] ${new Date().toISOString()} ${msg}`);
}

function isIgnored(relPath) {
  const segments = relPath.split(path.sep);
  return IGNORE_SEGMENTS.some((seg) => segments.includes(seg));
}

async function cycle() {
  if (running) {
    pendingWhileRunning = true;
    return;
  }
  running = true;
  try {
    const status = sh("git status --porcelain").trim();
    if (!status) {
      log("no changes, skipping");
      return;
    }

    log(`changes detected (${status.split("\n").length} entries) — typechecking before commit`);
    try {
      sh("npm run typecheck --silent");
    } catch (err) {
      log("typecheck FAILED — not committing. Fix the error and it will retry on the next change:");
      console.error(err.stdout || err.message);
      return;
    }

    sh("git add -A");
    const staged = sh("git status --porcelain").trim();
    if (!staged) {
      log("nothing staged after typecheck (unstaged-only changes?), skipping");
      return;
    }
    const summary = staged
      .split("\n")
      .slice(0, 5)
      .map((l) => l.slice(3))
      .join(", ");
    const stamp = new Date().toISOString();
    sh(
      `git commit -m "auto: snapshot ${stamp}" -m "Auto-committed by scripts/auto-commit-watch.mjs. Files: ${summary}${
        staged.split("\n").length > 5 ? ", ..." : ""
      }"`
    );
    log("committed locally");

    try {
      sh("git pull --rebase --autostash origin main");
    } catch (err) {
      log("git pull --rebase failed — commit is saved locally but NOT pushed. Resolve manually.");
      console.error(err.stdout || err.message);
      return;
    }

    try {
      sh("git push origin main");
      log("pushed to origin/main — Vercel/Render deploy should pick this up");
    } catch (err) {
      log("git push failed — commit is saved locally but NOT pushed.");
      console.error(err.stdout || err.message);
    }
  } finally {
    running = false;
    if (pendingWhileRunning) {
      pendingWhileRunning = false;
      schedule();
    }
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(cycle, DEBOUNCE_MS);
}

log(`watching ${ROOT} — auto-commits + pushes to origin/main after ${DEBOUNCE_MS / 1000}s of quiet`);
log("gate: npm run typecheck must pass or nothing is committed. Ctrl+C to stop.");

watch(ROOT, { recursive: true }, (_event, filename) => {
  if (!filename) return;
  if (isIgnored(filename)) return;
  schedule();
});
