/**
 * session_end — combined session save in one call.
 *
 * Replaces: awareness_update + journal_write + palace consolidation
 */

import { journalWrite } from "./journal-write.js";
import { awarenessUpdate } from "./awareness-update.js";
import { consolidateJournalToPalace } from "../palace/consolidate.js";
import { resolveProject } from "../storage/project.js";
import { ensurePalaceInitialized } from "../palace/rooms.js";
import type { SaveType } from "../storage/session.js";

export interface SessionEndInput {
  summary: string;
  insights?: Array<{
    title: string;
    evidence: string;
    applies_when: string[];
    source?: string;
    severity?: "critical" | "important" | "minor";
  }>;
  trajectory?: string;
  project?: string;
  saveType?: SaveType;
}

export interface SessionEndResult {
  success: boolean;
  journal_written: boolean;
  insights_processed: number;
  awareness_updated: boolean;
  palace_consolidated: boolean;
}

export async function sessionEnd(input: SessionEndInput): Promise<SessionEndResult> {
  const slug = await resolveProject(input.project);
  let journalWritten = false;
  let insightsProcessed = 0;
  let awarenessUpdated = false;
  let palaceConsolidated = false;

  // 1. Write journal summary
  try {
    const journalContent = [
      "## Brief",
      input.summary,
      "",
      input.trajectory ? `## Next\n${input.trajectory}` : "",
    ].filter(Boolean).join("\n");

    await journalWrite({ content: journalContent, project: slug, saveType: input.saveType ?? "arsave" });
    journalWritten = true;
  } catch {
    // Journal write is best-effort
  }

  // 2. Update awareness with insights
  if (input.insights && input.insights.length > 0) {
    try {
      const result = await awarenessUpdate({
        insights: input.insights.map((i) => ({
          title: i.title,
          evidence: i.evidence,
          applies_when: i.applies_when,
          source: i.source ?? `session_end ${new Date().toISOString().slice(0, 10)}`,
          severity: i.severity,
        })),
        trajectory: input.trajectory,
      });
      insightsProcessed = result.insights_processed?.length ?? input.insights.length;
      awarenessUpdated = true;
    } catch {
      // Awareness update is best-effort
    }
  }

  // 3. Consolidate journal to palace
  try {
    ensurePalaceInitialized(slug);
    consolidateJournalToPalace(slug);
    palaceConsolidated = true;
  } catch {
    // Consolidation is best-effort
  }

  return {
    success: journalWritten || awarenessUpdated,
    journal_written: journalWritten,
    insights_processed: insightsProcessed,
    awareness_updated: awarenessUpdated,
    palace_consolidated: palaceConsolidated,
  };
}
