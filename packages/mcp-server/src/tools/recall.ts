import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { smartRecall } from "agent-recall-core";

export function register(server: McpServer): void {
  server.registerTool("recall", {
    title: "Recall",
    description: "Search all memory stores at once. Returns ranked results from palace, journal, and insights.",
    inputSchema: {
      query: z.string().describe("What to search for."),
      project: z.string().default("auto"),
      limit: z.number().int().default(10).describe("Max results."),
      feedback: z.array(z.object({
        id: z.string().optional().describe("Result ID from previous recall (preferred)."),
        title: z.string().optional().describe("Result title (fallback if no ID)."),
        useful: z.boolean(),
      })).optional().describe("Rate previous results: was each result useful?"),
    },
  }, async ({ query, project, limit, feedback }) => {
    const result = await smartRecall({ query, project, limit, feedback });
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });
}
