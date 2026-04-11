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
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });
}
