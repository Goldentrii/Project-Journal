import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { check } from "agent-recall-core";

export function register(server: McpServer): void {
  server.registerTool("check", {
    title: "Check Understanding",
    description: "Record what you think the human wants. Returns predictive warnings based on past correction patterns.",
    inputSchema: {
      goal: z.string().describe("What you think the human wants."),
      confidence: z.enum(["high", "medium", "low"]),
      assumptions: z.array(z.string()).optional().describe("Key assumptions you're making."),
      human_correction: z.string().optional().describe("After human responds: what they actually wanted (or 'confirmed')."),
      delta: z.string().optional().describe("The gap between your understanding and reality (or 'none')."),
      project: z.string().default("auto"),
    },
  }, async ({ goal, confidence, assumptions, human_correction, delta, project }) => {
    const result = await check({ goal, confidence, assumptions, human_correction, delta, project });
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });
}
