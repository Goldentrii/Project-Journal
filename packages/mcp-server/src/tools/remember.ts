import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { smartRemember } from "agent-recall-core";

export function register(server: McpServer): void {
  server.registerTool("remember", {
    title: "Remember",
    description: "Save a memory. Auto-classifies and routes to the right store (journal, palace, knowledge, or awareness).",
    inputSchema: {
      content: z.string().describe("What to remember."),
      context: z.string().optional().describe("Optional hint: 'bug fix', 'architecture', 'insight', 'session note'"),
      project: z.string().default("auto"),
    },
  }, async ({ content, context, project }) => {
    const result = await smartRemember({ content, context, project });

    // Transparent routing: show where the memory went + how to find it
    const lines = [`Saved to ${result.routed_to} → ${result.file_path ?? result.auto_name}`];
    if (result.retrieval_hint) lines.push(`Find again: ${result.retrieval_hint}`);
    if (result.tags && result.tags.length > 0) lines.push(`Tags: ${result.tags.join(", ")}`);
    if (result.consistency_warnings && result.consistency_warnings.length > 0) {
      lines.push(`⚠ Consistency: ${result.consistency_warnings.map(w => w.detail).join("; ")}`);
    }

    return { content: [
      { type: "text" as const, text: lines.join("\n") },
      { type: "text" as const, text: JSON.stringify(result) },
    ] };
  });
}
