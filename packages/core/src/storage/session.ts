/**
 * Session identity + intelligent file naming.
 *
 * Naming format (v3.3.20+):
 *   {date}--{save-type}--{lines}L--{topic-slug}.md
 *
 * Example: 2026-04-20--arsave--45L--genome-review-v23.md
 *
 * - save-type: arsave / arsaveall / hook-end / hook-correction / capture
 * - lines: content line count (factual cost signal for agents)
 * - topic-slug: semantic keywords from generateSlug()
 *
 * Falls back to legacy naming (YYYY-MM-DD.md) when no opts provided.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { generateSlug } from "../helpers/auto-name.js";

/** 6-char hex ID, unique per process. Generated once on import. */
const SESSION_ID = crypto.randomBytes(3).toString("hex");

/** Track which files this session has claimed (owns). */
const ownedFiles = new Set<string>();

/** Get the current process session ID. */
export function getSessionId(): string {
  return SESSION_ID;
}

/** Save type for intelligent naming. */
export type SaveType = "arsave" | "arsaveall" | "hook-end" | "hook-correction" | "capture";

export interface SmartNameOpts {
  saveType: SaveType;
  content: string;
}

/**
 * Generate a semantic slug from content, capped at 40 chars.
 */
function topicSlug(content: string): string {
  const result = generateSlug(content);
  return result.slug.slice(0, 40);
}

/**
 * Generate an intelligent journal filename.
 *
 * New format: {date}--{saveType}--{lines}L--{slug}.md
 * Legacy fallback: {date}.md or {date}-{sessionId}.md
 *
 * If the computed filename already exists on disk, appends session ID suffix
 * to avoid overwriting a different session's file.
 */
export function journalFileName(date: string, baseExists: boolean, opts?: SmartNameOpts, dir?: string): string {
  // New intelligent naming
  if (opts?.saveType && opts?.content) {
    const lines = opts.content.split("\n").length;
    const slug = topicSlug(opts.content);
    const name = `${date}--${opts.saveType}--${lines}L--${slug}.md`;

    // Check collision: if file exists and wasn't written by this session, add suffix
    if (dir) {
      const fullPath = path.join(dir, name);
      const nameKey = `smart:${name}`;
      if (ownedFiles.has(nameKey)) return name;
      if (fs.existsSync(fullPath)) {
        // Different session already wrote a file with this name — add suffix
        const suffixed = `${date}--${opts.saveType}--${lines}L--${slug}-${SESSION_ID.slice(0, 4)}.md`;
        ownedFiles.add(`smart:${suffixed}`);
        return suffixed;
      }
      ownedFiles.add(nameKey);
    }
    return name;
  }

  // Legacy naming (backward compat)
  const baseKey = `journal:${date}`;

  if (ownedFiles.has(`${baseKey}:base`)) return `${date}.md`;
  if (ownedFiles.has(`${baseKey}:session`)) return `${date}-${SESSION_ID}.md`;

  if (!baseExists) {
    ownedFiles.add(`${baseKey}:base`);
    return `${date}.md`;
  }
  ownedFiles.add(`${baseKey}:session`);
  return `${date}-${SESSION_ID}.md`;
}

/**
 * Generate a session-scoped log filename for captures.
 *
 * New format: {date}--capture--{lines}L--{slug}.md
 * Legacy fallback: {date}-log.md
 */
export function captureLogFileName(date: string, baseExists: boolean, opts?: SmartNameOpts, dir?: string): string {
  if (opts?.saveType && opts?.content) {
    const lines = opts.content.split("\n").length;
    const slug = topicSlug(opts.content);
    return `${date}--capture--${lines}L--${slug}.md`;
  }

  // Legacy naming
  const baseKey = `capture:${date}`;

  if (ownedFiles.has(`${baseKey}:base`)) return `${date}-log.md`;
  if (ownedFiles.has(`${baseKey}:session`)) return `${date}-${SESSION_ID}-log.md`;

  if (!baseExists) {
    ownedFiles.add(`${baseKey}:base`);
    return `${date}-log.md`;
  }
  ownedFiles.add(`${baseKey}:session`);
  return `${date}-${SESSION_ID}-log.md`;
}

/** Reset owned files (for testing only). */
export function resetOwnedFiles(): void {
  ownedFiles.clear();
}
