/**
 * check — measure understanding gap with predictive guidance.
 *
 * Replaces: alignment_check (enhanced with past-delta analysis)
 * Phase 5: auto-promotes strong correction patterns (3+) to awareness.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { resolveProject } from "../storage/project.js";
import { getRoot } from "../types.js";
import { ensureDir, todayISO } from "../storage/fs-utils.js";
import { extractKeywords } from "../helpers/auto-name.js";
import {
  readAlignmentLog as readLog,
  extractWatchPatterns,
  type AlignmentRecord,
  type WatchForPattern,
} from "../helpers/alignment-patterns.js";
import { awarenessUpdate } from "./awareness-update.js";

export interface CheckInput {
  goal: string;
  confidence: "high" | "medium" | "low";
  assumptions?: string[];
  human_correction?: string;
  delta?: string;
  project?: string;
}

export interface WatchFor {
  pattern: string;
  frequency: number;
  suggestion: string;
}

export interface PastDelta {
  date: string;
  goal: string;
  delta: string;
}

export interface CheckResult {
  recorded: boolean;
  project: string;
  watch_for: WatchFor[];
  similar_past_deltas: PastDelta[];
  auto_promoted?: number;
}

function alignmentLogPath(project: string): string {
  return path.join(getRoot(), "projects", project, "alignment-log.json");
}

function writeAlignmentLog(project: string, records: AlignmentRecord[]): void {
  const p = alignmentLogPath(project);
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(records, null, 2), "utf-8");
}

export async function check(input: CheckInput): Promise<CheckResult> {
  const slug = await resolveProject(input.project);

  // 1. Record this alignment check
  const record: AlignmentRecord = {
    date: todayISO(),
    goal: input.goal,
    confidence: input.confidence,
    assumptions: input.assumptions ?? [],
    corrections: input.human_correction ? [input.human_correction] : undefined,
    delta: input.delta,
  };

  const log = readLog(slug);
  log.push(record);
  const trimmed = log.slice(-50);
  writeAlignmentLog(slug, trimmed);

  // 2. Find similar past goals (keyword overlap)
  const goalKeywords = extractKeywords(input.goal, 5);
  const similarDeltas: PastDelta[] = [];

  for (const past of trimmed.slice(0, -1)) {
    if (!past.delta && !past.corrections?.length) continue;

    const pastKeywords = extractKeywords(past.goal, 5);
    const overlap = goalKeywords.filter((k) => pastKeywords.some((pk) => pk.includes(k) || k.includes(pk)));

    if (overlap.length >= 2) {
      similarDeltas.push({
        date: past.date,
        goal: past.goal.slice(0, 80),
        delta: (past.delta ?? past.corrections?.join("; ") ?? "").slice(0, 120),
      });
    }
  }

  // 3. Extract patterns using shared helper
  const watchFor = extractWatchPatterns(trimmed, 3);

  // 4. Phase 5: auto-promote strong patterns (3+) to awareness
  let autoPromoted = 0;
  for (const w of watchFor) {
    if (w.frequency >= 3) {
      try {
        await awarenessUpdate({
          insights: [{
            title: `Human preference: ${w.pattern.slice(0, 60)}`,
            evidence: `Detected from ${w.frequency} corrections in alignment log`,
            applies_when: w.pattern.split(/[\s\-:()]+/).filter((word) => word.length > 3).slice(0, 5),
            source: `check auto-promote ${todayISO()}`,
            severity: "important",
          }],
        });
        autoPromoted++;
      } catch {
        // Best effort
      }
    }
  }

  return {
    recorded: true,
    project: slug,
    watch_for: watchFor,
    similar_past_deltas: similarDeltas.slice(0, 3),
    auto_promoted: autoPromoted > 0 ? autoPromoted : undefined,
  };
}
