I now have a complete picture of the codebase. Here is the comprehensive plan.

---

## AgentRecall SDK -- Comprehensive Execution Plan

### 1. Monorepo Structure

The repo transitions from a single `mcp-server/` package to an npm workspaces monorepo with three packages. The root `package.json` orchestrates workspaces. Existing files outside `mcp-server/` (README.md, SKILL.md, docs/, commands/) stay at root untouched.

**Target layout:**

```
AgentRecall/                          # repo root
  package.json                        # NEW — workspaces root (private)
  tsconfig.base.json                  # NEW — shared compiler options
  README.md                           # existing (untouched)
  SKILL.md                            # existing (untouched)
  docs/                               # existing (untouched)
  commands/                           # existing (untouched)
  packages/
    core/                             # NEW — @agent-recall/core
      package.json
      tsconfig.json                   # extends ../../tsconfig.base.json
      src/
        index.ts                      # barrel export
        types.ts                      # moved from mcp-server/src/types.ts
        palace/
          rooms.ts                    # moved from mcp-server/src/palace/rooms.ts
          graph.ts                    # moved
          fan-out.ts                  # moved
          awareness.ts                # moved
          salience.ts                 # moved
          insights-index.ts           # moved
          obsidian.ts                 # moved
          identity.ts                 # moved
          index-manager.ts            # moved
          log.ts                      # moved
        storage/
          paths.ts                    # moved
          fs-utils.ts                 # moved
          project.ts                  # moved
        helpers/
          journal-files.ts            # moved
          sections.ts                 # moved
        journal/                      # NEW — extracted business logic from tool files
          read.ts                     # logic from tools/journal-read.ts
          write.ts                    # logic from tools/journal-write.ts
          capture.ts                  # logic from tools/journal-capture.ts
          list.ts                     # logic from tools/journal-list.ts
          search.ts                   # logic from tools/journal-search.ts
          state.ts                    # logic from tools/journal-state.ts
          cold-start.ts              # logic from tools/journal-cold-start.ts
          archive.ts                 # logic from tools/journal-archive.ts
          rollup.ts                  # logic from tools/journal-rollup.ts
          projects.ts                # logic from tools/journal-projects.ts
        tools-logic/                  # NEW — extracted business logic from remaining tool files
          alignment-check.ts
          nudge.ts
          context-synthesize.ts
          knowledge-write.ts
          knowledge-read.ts
          palace-read.ts
          palace-write.ts
          palace-walk.ts
          palace-lint.ts
          palace-search.ts
          awareness-update.ts
          recall-insight.ts
      test/
        (all 7 existing test files, adapted to import from core)
    mcp-server/                       # RENAMED from mcp-server/ — agent-recall-mcp
      package.json                    # depends on @agent-recall/core
      tsconfig.json
      src/
        index.ts                      # MCP entrypoint (thin: imports from core, registers tools)
        server.ts                     # McpServer instance
        tools/                        # thin wrappers: validate via zod, call core, format MCP response
          journal-read.ts
          journal-write.ts
          ... (all 22 tool files)
        resources/
          journal-resources.ts
    sdk/                              # NEW — agent-recall (the SDK)
      package.json
      tsconfig.json
      src/
        index.ts                      # barrel: exports AgentRecall class + types
        agent-recall.ts               # main class
        types.ts                      # SDK-specific types (re-exports core types + SDK options)
      test/
        agent-recall.test.mjs
    cli/                              # NEW — @agent-recall/cli
      package.json
      tsconfig.json
      src/
        index.ts                      # #!/usr/bin/env node
        commands/
          read.ts
          write.ts
          capture.ts
          list.ts
          search.ts
          walk.ts
          palace.ts
          awareness.ts
          insight.ts
          init.ts
          projects.ts
          rollup.ts
          lint.ts
      test/
        cli.test.mjs
```

### 2. Core Extraction -- Exactly What Moves Where

**Principle:** Every file that contains business logic (data manipulation, file I/O, algorithms) moves to `packages/core/`. Tool files in `mcp-server/src/tools/` are split: the business logic becomes a pure async function in core, and the MCP tool registration wrapper stays in mcp-server.

**Files that move to `packages/core/src/` unchanged (same directory structure):**

| Source (current) | Destination |
|---|---|
| `mcp-server/src/types.ts` | `packages/core/src/types.ts` |
| `mcp-server/src/palace/rooms.ts` | `packages/core/src/palace/rooms.ts` |
| `mcp-server/src/palace/graph.ts` | `packages/core/src/palace/graph.ts` |
| `mcp-server/src/palace/fan-out.ts` | `packages/core/src/palace/fan-out.ts` |
| `mcp-server/src/palace/awareness.ts` | `packages/core/src/palace/awareness.ts` |
| `mcp-server/src/palace/salience.ts` | `packages/core/src/palace/salience.ts` |
| `mcp-server/src/palace/insights-index.ts` | `packages/core/src/palace/insights-index.ts` |
| `mcp-server/src/palace/obsidian.ts` | `packages/core/src/palace/obsidian.ts` |
| `mcp-server/src/palace/identity.ts` | `packages/core/src/palace/identity.ts` |
| `mcp-server/src/palace/index-manager.ts` | `packages/core/src/palace/index-manager.ts` |
| `mcp-server/src/palace/log.ts` | `packages/core/src/palace/log.ts` |
| `mcp-server/src/storage/paths.ts` | `packages/core/src/storage/paths.ts` |
| `mcp-server/src/storage/fs-utils.ts` | `packages/core/src/storage/fs-utils.ts` |
| `mcp-server/src/storage/project.ts` | `packages/core/src/storage/project.ts` |
| `mcp-server/src/helpers/journal-files.ts` | `packages/core/src/helpers/journal-files.ts` |
| `mcp-server/src/helpers/sections.ts` | `packages/core/src/helpers/sections.ts` |

**One critical refactor in types.ts:** The `JOURNAL_ROOT` and `LEGACY_ROOT` constants currently use `process.env.AGENT_RECALL_ROOT` at module load time. This must change to a function-based approach so the SDK can configure the root at runtime:

```typescript
// packages/core/src/types.ts — CHANGED

let _root: string | null = null;

export function setRoot(root: string): void {
  _root = root;
}

export function getRoot(): string {
  return _root ?? process.env.AGENT_RECALL_ROOT ?? path.join(os.homedir(), ".agent-recall");
}

// JOURNAL_ROOT becomes a getter for backward compatibility
export const JOURNAL_ROOT = new Proxy({} as { value: string }, {
  get: () => getRoot(),
}) as unknown as string;
// OR simpler: just change all consumers to call getRoot() and stop exporting JOURNAL_ROOT as a constant
```

**Simpler approach (recommended):** Replace all references to `JOURNAL_ROOT` with `getRoot()` calls across all core files. This is about 15 call sites. The `LEGACY_ROOT` similarly becomes `getLegacyRoot()`. This is a breaking change in the internal API but invisible to MCP users since they interact via tools.

**Business logic extraction from tool files:**

Each tool file currently has the pattern: `register(server) { server.registerTool("name", schema, async handler) }`. The handler contains business logic. Extract the handler body into a standalone async function in core.

Example -- `palace-write.ts` splits into:

**`packages/core/src/tools-logic/palace-write.ts`:**
```typescript
import type { Importance } from "../types.js";
import { resolveProject } from "../storage/project.js";
import { palaceDir } from "../storage/paths.js";
import { ensureDir } from "../storage/fs-utils.js";
import { ensurePalaceInitialized, createRoom, roomExists, updateRoomMeta } from "../palace/rooms.js";
import { fanOut } from "../palace/fan-out.js";
import { updatePalaceIndex } from "../palace/index-manager.js";
import { generateFrontmatter } from "../palace/obsidian.js";
import { appendToLog } from "../palace/log.js";
import * as fs from "node:fs";
import * as path from "node:path";

export interface PalaceWriteInput {
  room: string;
  topic?: string;
  content: string;
  connections?: string[];
  importance?: Importance;
  project?: string;
}

export interface PalaceWriteResult {
  success: boolean;
  room: string;
  topic: string;
  project: string;
  importance: Importance;
  fan_out: { updated_rooms: string[]; new_edges: number };
}

export async function palaceWrite(input: PalaceWriteInput): Promise<PalaceWriteResult> {
  const slug = await resolveProject(input.project ?? "auto");
  const importance: Importance = input.importance ?? "medium";
  ensurePalaceInitialized(slug);

  if (!roomExists(slug, input.room)) {
    createRoom(slug, input.room, input.room.charAt(0).toUpperCase() + input.room.slice(1), `Auto-created room for ${input.room}`, []);
  }

  const pd = palaceDir(slug);
  const targetTopic = input.topic ?? "README";
  const targetFile = path.join(pd, "rooms", input.room, `${targetTopic}.md`);
  ensureDir(path.dirname(targetFile));

  const timestamp = new Date().toISOString();

  // ... same logic as current tool handler ...

  return { success: true, room: input.room, topic: targetTopic, project: slug, importance, fan_out: { updated_rooms: fanOutResult.updatedRooms, new_edges: fanOutResult.newEdges } };
}
```

**`packages/mcp-server/src/tools/palace-write.ts`** becomes a thin wrapper:
```typescript
import * as z from "zod/v4";
import type { ServerType } from "../server.js";
import { palaceWrite } from "@agent-recall/core";
import type { Importance } from "@agent-recall/core";

export function register(server: ServerType): void {
  server.registerTool("palace_write", {
    title: "Write to Palace Room",
    description: "...",
    inputSchema: { /* same zod schema */ },
  }, async (input) => {
    const result = await palaceWrite(input as any);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  });
}
```

**Files that stay in `packages/mcp-server/`:**

| File | Reason |
|---|---|
| `src/index.ts` | MCP entrypoint, CLI flags, tool registration |
| `src/server.ts` | McpServer instance creation |
| `src/tools/*.ts` | Thin wrappers (zod schema + call core + format MCP response) |
| `src/resources/journal-resources.ts` | MCP resource registration |

### 3. SDK API Design -- Full Public Surface

**`packages/sdk/src/agent-recall.ts`:**

```typescript
import {
  // Palace
  ensurePalaceInitialized, createRoom, getRoomMeta, listRooms,
  updateRoomMeta, roomExists, recordAccess,
  // Graph
  readGraph, addEdge, getConnectedRooms,
  // Awareness
  readAwarenessState, addInsight, detectCompoundInsights,
  readAwareness, initAwareness, renderAwareness,
  // Insights Index
  recallInsights, addIndexedInsight, readInsightsIndex,
  // Storage
  setRoot, getRoot,
  // Types
  type RoomMeta, type PalaceIndex, type GraphEdge, type SessionState,
  type Importance, type Confidence, type WalkDepth,
  type AwarenessState, type Insight, type CompoundInsight,
  type IndexedInsight, type InsightsIndex, type FanOutResult,
  type JournalEntry, type ProjectInfo,
} from "@agent-recall/core";

// Import extracted tool-logic functions
import { palaceWrite, type PalaceWriteInput, type PalaceWriteResult } from "@agent-recall/core";
import { palaceRead, type PalaceReadInput, type PalaceReadResult } from "@agent-recall/core";
import { palaceWalk, type PalaceWalkInput, type PalaceWalkResult } from "@agent-recall/core";
import { palaceLint, type PalaceLintInput, type PalaceLintResult } from "@agent-recall/core";
import { palaceSearch, type PalaceSearchInput, type PalaceSearchResult } from "@agent-recall/core";
import { awarenessUpdate, type AwarenessUpdateInput, type AwarenessUpdateResult } from "@agent-recall/core";
import { recallInsight, type RecallInsightInput, type RecallInsightResult } from "@agent-recall/core";

import { journalRead, type JournalReadInput, type JournalReadResult } from "@agent-recall/core";
import { journalWrite, type JournalWriteInput, type JournalWriteResult } from "@agent-recall/core";
import { journalCapture, type JournalCaptureInput, type JournalCaptureResult } from "@agent-recall/core";
import { journalList, type JournalListInput, type JournalListResult } from "@agent-recall/core";
import { journalSearch, type JournalSearchInput, type JournalSearchResult } from "@agent-recall/core";
import { journalState, type JournalStateInput, type JournalStateResult } from "@agent-recall/core";
import { journalColdStart, type JournalColdStartResult } from "@agent-recall/core";
import { journalArchive, type JournalArchiveInput, type JournalArchiveResult } from "@agent-recall/core";
import { journalRollup, type JournalRollupInput, type JournalRollupResult } from "@agent-recall/core";
import { journalProjects, type JournalProjectsResult } from "@agent-recall/core";
import { alignmentCheck, type AlignmentCheckInput } from "@agent-recall/core";
import { nudge, type NudgeInput } from "@agent-recall/core";
import { contextSynthesize, type ContextSynthesizeInput, type ContextSynthesizeResult } from "@agent-recall/core";
import { knowledgeWrite, type KnowledgeWriteInput } from "@agent-recall/core";
import { knowledgeRead, type KnowledgeReadInput } from "@agent-recall/core";

export interface AgentRecallOptions {
  /** Storage root directory. Default: ~/.agent-recall */
  root?: string;
  /** Project slug. Default: auto-detect from git/cwd */
  project?: string;
}

export class AgentRecall {
  private readonly project: string | "auto";

  constructor(options?: AgentRecallOptions) {
    if (options?.root) {
      setRoot(options.root);
    }
    this.project = options?.project ?? "auto";
  }

  // ─── L1: Working Memory (Capture) ─────────────────────────────

  /** Lightweight Q&A capture. Appends to today's log file. */
  async capture(question: string, answer: string, opts?: { tags?: string[]; palaceRoom?: string }): Promise<JournalCaptureResult> {
    return journalCapture({ question, answer, tags: opts?.tags, palace_room: opts?.palaceRoom, project: this.project });
  }

  // ─── L2: Episodic Memory (Journal) ────────────────────────────

  /** Read a journal entry. date='latest' for most recent. */
  async journalRead(opts?: { date?: string; section?: string }): Promise<JournalReadResult> {
    return journalRead({ date: opts?.date ?? "latest", section: opts?.section ?? "all", project: this.project });
  }

  /** Append content to today's journal. */
  async journalWrite(content: string, opts?: { section?: string; palaceRoom?: string }): Promise<JournalWriteResult> {
    return journalWrite({ content, section: opts?.section, palace_room: opts?.palaceRoom, project: this.project });
  }

  /** List journal entries. */
  async journalList(limit?: number): Promise<JournalListResult> {
    return journalList({ project: this.project, limit: limit ?? 10 });
  }

  /** Full-text search across journals. */
  async journalSearch(query: string, opts?: { section?: string; includePalace?: boolean }): Promise<JournalSearchResult> {
    return journalSearch({ query, project: this.project, section: opts?.section, include_palace: opts?.includePalace });
  }

  /** Read or write structured session state (JSON). */
  async state(action: "read" | "write", data?: string, date?: string): Promise<JournalStateResult> {
    return journalState({ action, data, date: date ?? "latest", project: this.project });
  }

  /** Palace-first cold start brief. */
  async coldStart(): Promise<JournalColdStartResult> {
    return journalColdStart({ project: this.project });
  }

  /** Archive old journal entries. */
  async archive(olderThanDays?: number): Promise<JournalArchiveResult> {
    return journalArchive({ older_than_days: olderThanDays ?? 7, project: this.project });
  }

  /** Condense old daily journals into weekly summaries. */
  async rollup(opts?: { minAgeDays?: number; minEntries?: number; dryRun?: boolean }): Promise<JournalRollupResult> {
    return journalRollup({ min_age_days: opts?.minAgeDays ?? 7, min_entries: opts?.minEntries ?? 2, dry_run: opts?.dryRun ?? false, project: this.project });
  }

  /** List all tracked projects. */
  async projects(): Promise<JournalProjectsResult> {
    return journalProjects();
  }

  // ─── L3: Memory Palace ────────────────────────────────────────

  /** Write memory to a palace room with fan-out cross-referencing. */
  async palaceWrite(room: string, content: string, opts?: { topic?: string; connections?: string[]; importance?: Importance }): Promise<PalaceWriteResult> {
    return palaceWrite({ room, content, topic: opts?.topic, connections: opts?.connections, importance: opts?.importance, project: this.project });
  }

  /** Read a palace room or list all rooms (omit room param). */
  async palaceRead(room?: string, topic?: string): Promise<PalaceReadResult> {
    return palaceRead({ room, topic, project: this.project });
  }

  /** Progressive context loading: identity -> active -> relevant -> full. */
  async walk(depth?: WalkDepth, focus?: string): Promise<PalaceWalkResult> {
    return palaceWalk({ depth: depth ?? "active", focus, project: this.project });
  }

  /** Health check: stale, orphans, low salience, missing refs. */
  async lint(fix?: boolean): Promise<PalaceLintResult> {
    return palaceLint({ fix: fix ?? false, project: this.project });
  }

  /** Full-text search across palace rooms, ranked by salience. */
  async palaceSearch(query: string, room?: string): Promise<PalaceSearchResult> {
    return palaceSearch({ query, room, project: this.project });
  }

  // ─── L4: Awareness ────────────────────────────────────────────

  /** Update awareness with new insights. Call at session end. */
  async awarenessUpdate(insights: AwarenessUpdateInput["insights"], opts?: { trajectory?: string; blindSpots?: string[]; identity?: string }): Promise<AwarenessUpdateResult> {
    return awarenessUpdate({ insights, trajectory: opts?.trajectory, blind_spots: opts?.blindSpots, identity: opts?.identity });
  }

  /** Read the current awareness document (markdown). */
  readAwareness(): string {
    return readAwareness();
  }

  /** Read structured awareness state (JSON). */
  readAwarenessState(): AwarenessState | null {
    return readAwarenessState();
  }

  // ─── L5: Insight Index ────────────────────────────────────────

  /** Recall cross-project insights relevant to current task. */
  async recallInsight(context: string, opts?: { limit?: number; includeAwareness?: boolean }): Promise<RecallInsightResult> {
    return recallInsight({ context, limit: opts?.limit ?? 5, include_awareness: opts?.includeAwareness ?? true });
  }

  // ─── Alignment & Knowledge ────────────────────────────────────

  /** Record alignment check (measures Intelligent Distance gap). */
  async alignmentCheck(input: AlignmentCheckInput): Promise<{ success: boolean }> {
    return alignmentCheck({ ...input, project: input.project ?? this.project });
  }

  /** Surface a contradiction between past and current statements. */
  async nudge(input: NudgeInput): Promise<{ success: boolean }> {
    return nudge({ ...input, project: input.project ?? this.project });
  }

  /** Synthesize context from recent journals and palace rooms. */
  async synthesize(opts?: { entries?: number; focus?: string; includePalace?: boolean; consolidate?: boolean }): Promise<ContextSynthesizeResult> {
    return contextSynthesize({ entries: opts?.entries ?? 5, focus: (opts?.focus ?? "full") as any, include_palace: opts?.includePalace ?? true, consolidate: opts?.consolidate ?? false, project: this.project });
  }

  /** Write a structured knowledge lesson. */
  async knowledgeWrite(input: KnowledgeWriteInput): Promise<{ success: boolean }> {
    return knowledgeWrite({ ...input, project: input.project ?? this.project });
  }

  /** Read knowledge lessons. */
  async knowledgeRead(opts?: KnowledgeReadInput): Promise<string> {
    return knowledgeRead(opts ?? {});
  }

  // ─── Low-level access (for advanced users / integrations) ─────

  /** Direct access to core palace functions. */
  get palace() {
    const project = this.project;
    return {
      ensureInitialized: () => ensurePalaceInitialized(project === "auto" ? "default" : project),
      createRoom: (slug: string, name: string, description: string, tags?: string[]) =>
        createRoom(project === "auto" ? "default" : project, slug, name, description, tags),
      getRoom: (slug: string) => getRoomMeta(project === "auto" ? "default" : project, slug),
      listRooms: () => listRooms(project === "auto" ? "default" : project),
      roomExists: (slug: string) => roomExists(project === "auto" ? "default" : project, slug),
    };
  }

  /** Direct access to graph functions. */
  get graph() {
    return { readGraph, addEdge, getConnectedRooms };
  }
}
```

**Usage examples:**

```typescript
import { AgentRecall } from "agent-recall";

// Basic usage
const ar = new AgentRecall({ project: "my-project" });

// L1: Capture a Q&A
await ar.capture("Why Redis?", "Fast vector search, <10ms KNN");

// L2: Read latest journal
const entry = await ar.journalRead();

// L3: Write to palace with cross-refs
await ar.palaceWrite("architecture", "Chose Redis for vector storage. See [[goals/search-feature]]", {
  importance: "high",
  connections: ["goals"],
});

// L3: Walk the palace for cold-start
const context = await ar.walk("active");

// L4: Update awareness at session end
await ar.awarenessUpdate([{
  title: "Redis vector search is fast enough for 100K vectors",
  evidence: "Benchmarked at 8ms p99 for 50K vectors",
  applies_when: ["vector-search", "semantic-search", "redis"],
  source: "my-project, 2026-04-09",
  severity: "important",
}]);

// L5: Recall insights before starting
const insights = await ar.recallInsight("building a search feature with embeddings");

// LangChain integration
import { AgentRecall } from "agent-recall";
const memory = new AgentRecall({ project: "langchain-app" });
// Use in tool callbacks, chain steps, etc.
```

### 4. CLI Design -- All Commands with Flags

**Package:** `@agent-recall/cli`  
**Binary name:** `ar` (shorter than `pj` from the old design, unique on npm)

```
ar <command> [options]

JOURNAL COMMANDS:
  ar read [--date YYYY-MM-DD] [--section <name>] [--project <slug>]
    Read a journal entry. Default: latest.
    --section: all|brief|qa|completed|status|blockers|next|decisions|reflection|files|observations

  ar write <content> [--section <name>] [--palace-room <slug>] [--project <slug>]
    Append content to today's journal.

  ar capture <question> <answer> [--tags tag1,tag2] [--palace-room <slug>] [--project <slug>]
    Layer 1: lightweight Q&A capture.

  ar list [--limit N] [--project <slug>]
    List recent journal entries. Default limit: 10.

  ar search <query> [--section <name>] [--include-palace] [--project <slug>]
    Full-text search across journals.

  ar state read [--date YYYY-MM-DD] [--project <slug>]
  ar state write <json-string> [--project <slug>]
    Read or write structured session state.

  ar cold-start [--project <slug>]
    Palace-first cold start brief.

  ar archive [--older-than-days N] [--project <slug>]
    Archive entries older than N days. Default: 7.

  ar rollup [--min-age-days N] [--min-entries N] [--dry-run] [--project <slug>]
    Condense daily journals into weekly summaries.

PALACE COMMANDS:
  ar palace read [<room>] [--topic <name>] [--project <slug>]
    Read a room or list all rooms.

  ar palace write <room> <content> [--topic <name>] [--importance high|medium|low] [--connections r1,r2] [--project <slug>]
    Write memory to a palace room.

  ar palace walk [--depth identity|active|relevant|full] [--focus <query>] [--project <slug>]
    Progressive context loading.

  ar palace search <query> [--room <slug>] [--project <slug>]
    Search across palace rooms.

  ar palace lint [--fix] [--project <slug>]
    Health check for the Memory Palace.

AWARENESS COMMANDS:
  ar awareness read [--json]
    Read current awareness (markdown or JSON).

  ar awareness update --insight "<title>" --evidence "<evidence>" --applies-when kw1,kw2 --source "<source>"
    Add insight to awareness. Repeatable.

INSIGHT COMMANDS:
  ar insight <context-description> [--limit N]
    Recall cross-project insights for a context.

KNOWLEDGE COMMANDS:
  ar knowledge write --category <cat> --title "<title>" --what "<what>" --cause "<cause>" --fix "<fix>" [--severity critical|important|minor]
  ar knowledge read [--category <cat>] [--project <slug>] [--query <term>]

META COMMANDS:
  ar projects
    List all tracked projects.

  ar init [--project <slug>]
    Initialize agent-recall for current repo.

  ar synthesize [--entries N] [--focus full|decisions|blockers|goals] [--consolidate] [--project <slug>]
    Generate L3 synthesis.

GLOBAL FLAGS:
  --root <path>     Storage root (default: ~/.agent-recall or AGENT_RECALL_ROOT)
  --project <slug>  Project override (default: auto-detect)
  --json            Output as JSON (default for most commands, optional for awareness)
  --help, -h        Show help
  --version, -v     Show version
```

**CLI implementation approach:** Use no external arg-parsing library. Node's `process.argv` + a simple hand-rolled parser (consistent with the zero-dependency goal). Each command file exports a `run(args: string[]): Promise<void>` function.

### 5. Package Boundaries

| Package | npm name | Dependencies | Exports |
|---|---|---|---|
| `packages/core` | `@agent-recall/core` | `zod` (already used, for input validation in core logic) | All types, all business logic functions, `setRoot`/`getRoot` |
| `packages/mcp-server` | `agent-recall-mcp` | `@agent-recall/core`, `@modelcontextprotocol/sdk` | MCP server entrypoint (bin) |
| `packages/sdk` | `agent-recall` | `@agent-recall/core` | `AgentRecall` class, all types |
| `packages/cli` | `@agent-recall/cli` | `@agent-recall/core` | `ar` binary |

**Dependency graph (one-way only, no cycles):**
```
cli ──→ core
sdk ──→ core
mcp-server ──→ core
```

**What each package exports:**

**`@agent-recall/core` (packages/core/src/index.ts):**
```typescript
// Types
export type { RoomMeta, PalaceIndex, GraphEdge, PalaceGraph, SessionState, JournalEntry, ProjectInfo, Importance, Confidence, WalkDepth } from "./types.js";
export type { AwarenessState, Insight, CompoundInsight } from "./palace/awareness.js";
export type { IndexedInsight, InsightsIndex } from "./palace/insights-index.js";
export type { FanOutResult } from "./palace/fan-out.js";
export { VERSION, SECTION_HEADERS, DEFAULT_PALACE_ROOMS, setRoot, getRoot } from "./types.js";

// Palace
export { createRoom, getRoomMeta, updateRoomMeta, listRooms, roomExists, ensurePalaceInitialized, recordAccess } from "./palace/rooms.js";
export { readGraph, writeGraph, addEdge, removeEdgesFor, getConnectionCount, getConnectedRooms } from "./palace/graph.js";
export { fanOut } from "./palace/fan-out.js";
export { readAwareness, writeAwareness, readAwarenessState, writeAwarenessState, initAwareness, addInsight, detectCompoundInsights, renderAwareness } from "./palace/awareness.js";
export { computeSalience, ARCHIVE_THRESHOLD, AUTO_ARCHIVE_THRESHOLD } from "./palace/salience.js";
export { readInsightsIndex, writeInsightsIndex, addIndexedInsight, recallInsights } from "./palace/insights-index.js";
export { readIdentity, writeIdentity } from "./palace/identity.js";
export { readPalaceIndex, updatePalaceIndex } from "./palace/index-manager.js";
export { extractWikilinks, addBackReference, generateFrontmatter, roomReadmeContent } from "./palace/obsidian.js";
export { appendToLog } from "./palace/log.js";

// Storage
export { journalDir, journalDirs, palaceDir, roomDir } from "./storage/paths.js";
export { ensureDir, todayISO, readJsonSafe, writeJsonAtomic } from "./storage/fs-utils.js";
export { detectProject, resolveProject, listAllProjects } from "./storage/project.js";

// Helpers
export { listJournalFiles, readJournalFile, extractTitle, extractMomentum, countLogEntries, updateIndex } from "./helpers/journal-files.js";
export { extractSection, appendToSection } from "./helpers/sections.js";

// Tool logic functions (extracted from MCP tool handlers)
export { palaceWrite, type PalaceWriteInput, type PalaceWriteResult } from "./tools-logic/palace-write.js";
export { palaceRead, type PalaceReadInput, type PalaceReadResult } from "./tools-logic/palace-read.js";
// ... (all 22 tool-logic exports)
```

**`agent-recall` (packages/sdk/src/index.ts):**
```typescript
export { AgentRecall } from "./agent-recall.js";
export type { AgentRecallOptions } from "./agent-recall.js";
// Re-export commonly-needed types from core
export type { RoomMeta, SessionState, Importance, WalkDepth, AwarenessState, Insight } from "@agent-recall/core";
```

### 6. Migration Strategy -- No Breaking Changes for Existing Users

**Problem:** The `agent-recall-mcp` package is published at v3.4.0 on npm. Users install it with `npx agent-recall-mcp`. We cannot break this.

**Strategy: Wrapper package approach.**

Phase 1-2 work is internal restructuring. The published `agent-recall-mcp` package continues to work identically. Here is the step-by-step:

1. **Create monorepo structure first** -- add root `package.json` with workspaces, create `packages/` directory structure.

2. **Move files** -- `git mv mcp-server/src/palace/* packages/core/src/palace/` etc. The `mcp-server/` directory becomes `packages/mcp-server/`.

3. **Update all import paths** -- In core files, imports are relative and stay mostly the same (same directory structure). In mcp-server tool files, change `../palace/rooms.js` to `@agent-recall/core`.

4. **Keep `packages/mcp-server/package.json` name as `agent-recall-mcp`** -- same npm package name, same bin entry, same behavior. Version bumps to 4.0.0 to signal the internal restructuring.

5. **The `agent-recall-mcp` bin entry calls the same entrypoint** -- users running `npx agent-recall-mcp` get the same MCP server.

6. **Backward-compatible `agent-recall-mcp@4.0.0`** -- All 22 tools produce identical outputs. The only difference is internal code organization.

7. **New packages are additive** -- `agent-recall` (SDK) and `@agent-recall/cli` are brand new npm publishes. No migration needed.

8. **Test gate** -- All 65 existing tests must pass against `packages/core` before any publish. Run tests against the new package structure to confirm.

### 7. Test Strategy

**Test distribution:**

| Package | Test files | What they test |
|---|---|---|
| `packages/core/test/` | 7 existing + ~10 new | All business logic: rooms, graph, salience, awareness, rollup, journal files, sections, fan-out, insights-index, tool-logic functions |
| `packages/mcp-server/test/` | ~3 new | MCP tool registration, schema validation, response format |
| `packages/sdk/test/` | ~5 new | AgentRecall class methods, options handling, project resolution |
| `packages/cli/test/` | ~5 new | CLI argument parsing, command dispatch, output formatting |

**Existing tests move to core:**

All 7 current test files (`basics.test.mjs`, `palace.test.mjs`, `rooms.test.mjs`, `graph.test.mjs`, `salience.test.mjs`, `awareness.test.mjs`, `rollup.test.mjs`) move to `packages/core/test/`. They currently test the modules that are moving to core. Only import paths change (from `../dist/palace/rooms.js` to `../dist/palace/rooms.js` -- same relative path since directory structure is preserved).

**New tests for core (tool-logic functions):**

```
packages/core/test/
  palace-write.test.mjs     — Test palaceWrite() function directly
  palace-read.test.mjs      — Test palaceRead() function directly
  palace-walk.test.mjs      — Test palaceWalk() function directly
  journal-write.test.mjs    — Test journalWrite() function directly
  journal-read.test.mjs     — Test journalRead() function directly
  journal-capture.test.mjs  — Test journalCapture() function directly
  awareness-update.test.mjs — Test awarenessUpdate() function directly
  recall-insight.test.mjs   — Test recallInsight() function directly
  cold-start.test.mjs       — Test journalColdStart() function directly
  integration.test.mjs      — End-to-end: capture -> write -> search -> walk cycle
```

**New tests for SDK:**

```
packages/sdk/test/
  agent-recall.test.mjs         — Constructor, options, project resolution
  journal-methods.test.mjs      — capture, journalRead, journalWrite, list, search
  palace-methods.test.mjs       — palaceWrite, palaceRead, walk, lint, search
  awareness-methods.test.mjs    — awarenessUpdate, readAwareness, recallInsight
  langchain-pattern.test.mjs    — Verify SDK works as a memory backend pattern
```

**Test framework:** Continue using `node:test` (built-in, zero dependencies). All tests use `process.env.AGENT_RECALL_ROOT` pointed to a temp directory, same pattern as existing tests.

### 8. Build System

**Root `package.json`:**
```json
{
  "private": true,
  "workspaces": [
    "packages/core",
    "packages/mcp-server",
    "packages/sdk",
    "packages/cli"
  ],
  "scripts": {
    "build": "npm run build -w packages/core && npm run build -w packages/mcp-server && npm run build -w packages/sdk && npm run build -w packages/cli",
    "test": "npm test -w packages/core && npm test -w packages/mcp-server && npm test -w packages/sdk && npm test -w packages/cli",
    "clean": "rm -rf packages/*/dist",
    "lint": "tsc --noEmit -p packages/core && tsc --noEmit -p packages/mcp-server && tsc --noEmit -p packages/sdk && tsc --noEmit -p packages/cli"
  }
}
```

**Root `tsconfig.base.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

**`packages/core/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`packages/mcp-server/tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [
    { "path": "../core" }
  ],
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**`packages/sdk/tsconfig.json` and `packages/cli/tsconfig.json`:** Same pattern, with `references` to `../core`.

**Build order** (enforced by workspace dependencies and `tsc --build`):
1. `@agent-recall/core`
2. `agent-recall-mcp`, `agent-recall`, `@agent-recall/cli` (parallel, all depend only on core)

**Each package's `package.json` exports:**

**`packages/core/package.json`:**
```json
{
  "name": "@agent-recall/core",
  "version": "4.0.0",
  "description": "Core memory palace engine for AgentRecall",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "node --test test/*.test.mjs"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  },
  "engines": { "node": ">=18.0.0" }
}
```

**`packages/mcp-server/package.json`:**
```json
{
  "name": "agent-recall-mcp",
  "version": "4.0.0",
  "description": "Memory Palace MCP server for AI agents",
  "type": "module",
  "main": "dist/index.js",
  "bin": { "agent-recall-mcp": "dist/index.js" },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc && node -e \"require('fs').chmodSync('dist/index.js', '755')\"",
    "test": "node --test test/*.test.mjs"
  },
  "dependencies": {
    "@agent-recall/core": "^4.0.0",
    "@modelcontextprotocol/sdk": "^1.28.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

**`packages/sdk/package.json`:**
```json
{
  "name": "agent-recall",
  "version": "1.0.0",
  "description": "SDK for AgentRecall — persistent, compounding memory for AI agents",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "node --test test/*.test.mjs"
  },
  "dependencies": {
    "@agent-recall/core": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  },
  "keywords": ["ai-memory", "agent-recall", "memory-palace", "langchain", "crewai", "agent-memory"]
}
```

**`packages/cli/package.json`:**
```json
{
  "name": "@agent-recall/cli",
  "version": "1.0.0",
  "description": "CLI for AgentRecall memory system",
  "type": "module",
  "bin": { "ar": "dist/index.js" },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc && node -e \"require('fs').chmodSync('dist/index.js', '755')\"",
    "test": "node --test test/*.test.mjs"
  },
  "dependencies": {
    "@agent-recall/core": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0"
  }
}
```

### 9. Publish Strategy

| Package | npm name | Version | Visibility | Publish order |
|---|---|---|---|---|
| `packages/core` | `@agent-recall/core` | 4.0.0 | public | 1st |
| `packages/mcp-server` | `agent-recall-mcp` | 4.0.0 | public (existing) | 2nd |
| `packages/sdk` | `agent-recall` | 1.0.0 | public (new) | 3rd |
| `packages/cli` | `@agent-recall/cli` | 1.0.0 | public (new) | 4th |

**Version rationale:**
- Core and MCP jump to 4.0.0 (semver: breaking internal restructure, even though external behavior is identical). This clearly signals "new architecture" vs the old 3.4.0.
- SDK and CLI start at 1.0.0 (new packages, stable API from day one).

**npm org:** The `@agent-recall` scope needs to be claimed on npm. If unavailable, fall back to `@agentrecall`. Unscoped packages (`agent-recall`, `agent-recall-mcp`) are already claimed or available.

**Publish script (root `package.json`):**
```json
{
  "scripts": {
    "release": "npm run build && npm run test && npm publish -w packages/core && npm publish -w packages/mcp-server && npm publish -w packages/sdk && npm publish -w packages/cli"
  }
}
```

**Pre-publish checklist:**
1. All 65+ tests pass
2. `npm pack --dry-run` on each package confirms correct file list
3. README.md exists in each package with installation + usage instructions
4. `tsc --noEmit` across all packages succeeds
5. The `npx agent-recall-mcp --list-tools` command still works identically

### 10. Phase Breakdown

---

**Phase 1: Monorepo Foundation + Core Extraction (3-4 hours)**

*Deliverables:*
- Root `package.json` with workspaces
- Root `tsconfig.base.json`
- `packages/core/` with all business logic files moved from `mcp-server/src/`
- The `JOURNAL_ROOT` constant refactored to `getRoot()` function
- All internal imports updated to use relative paths within core
- `packages/core/src/index.ts` barrel export
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- All 7 existing tests passing against core: `npm test -w packages/core`

*Key files to create/modify:*
- `/Users/tongwu/Projects/AgentRecall/package.json` (NEW)
- `/Users/tongwu/Projects/AgentRecall/tsconfig.base.json` (NEW)
- `/Users/tongwu/Projects/AgentRecall/packages/core/package.json` (NEW)
- `/Users/tongwu/Projects/AgentRecall/packages/core/tsconfig.json` (NEW)
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/index.ts` (NEW)
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/types.ts` (MOVED + refactored getRoot)
- All files in `packages/core/src/palace/`, `packages/core/src/storage/`, `packages/core/src/helpers/` (MOVED)
- All 7 test files in `packages/core/test/` (MOVED, import paths updated)

*Verification:* `cd /Users/tongwu/Projects/AgentRecall && npm run build -w packages/core && npm test -w packages/core`

---

**Phase 2: Extract Tool Logic into Core Functions (3-4 hours)**

*Deliverables:*
- `packages/core/src/tools-logic/` with 22 extracted business logic functions
- Each function has typed Input and Result interfaces
- Each function is a standalone async function (no MCP dependency)
- All functions exported from `packages/core/src/index.ts`
- New tests for the 10 most important tool-logic functions

*Key files to create:*
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/palace-write.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/palace-read.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/palace-walk.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/palace-lint.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/palace-search.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-read.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-write.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-capture.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-list.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-search.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-state.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-cold-start.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-archive.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-rollup.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/journal-projects.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/alignment-check.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/nudge.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/context-synthesize.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/knowledge-write.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/knowledge-read.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/awareness-update.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/core/src/tools-logic/recall-insight.ts`
- 10 new test files in `packages/core/test/`

*Verification:* `npm run build -w packages/core && npm test -w packages/core` -- 65 existing + ~30 new tests pass.

---

**Phase 3: Rebuild MCP Server as Thin Wrapper (2-3 hours)**

*Deliverables:*
- `packages/mcp-server/` with the MCP entrypoint
- All 22 tool files rewritten as thin wrappers (zod schema + call core function + format MCP response)
- `packages/mcp-server/package.json` depends on `@agent-recall/core`
- `npx agent-recall-mcp --list-tools` still works
- Resources registration still works

*Key files to create:*
- `/Users/tongwu/Projects/AgentRecall/packages/mcp-server/package.json`
- `/Users/tongwu/Projects/AgentRecall/packages/mcp-server/tsconfig.json`
- `/Users/tongwu/Projects/AgentRecall/packages/mcp-server/src/index.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/mcp-server/src/server.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/mcp-server/src/tools/*.ts` (22 files, each ~20-30 lines)
- `/Users/tongwu/Projects/AgentRecall/packages/mcp-server/src/resources/journal-resources.ts`

*Verification:* Build succeeds. `node packages/mcp-server/dist/index.js --list-tools` outputs the same 22 tools. Run MCP server manually and call a tool via stdin to verify end-to-end.

---

**Phase 4: Build the SDK (2-3 hours)**

*Deliverables:*
- `packages/sdk/` with the `AgentRecall` class
- Full API surface as designed in section 3
- Typed options, method overloads, JSDoc comments
- 5 SDK test files passing

*Key files to create:*
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/package.json`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/tsconfig.json`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/src/index.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/src/agent-recall.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/src/types.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/test/agent-recall.test.mjs`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/test/journal-methods.test.mjs`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/test/palace-methods.test.mjs`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/test/awareness-methods.test.mjs`
- `/Users/tongwu/Projects/AgentRecall/packages/sdk/test/langchain-pattern.test.mjs`

*Verification:* `npm run build -w packages/sdk && npm test -w packages/sdk` -- all 5 test files pass. The following code runs successfully:
```typescript
import { AgentRecall } from "agent-recall";
const ar = new AgentRecall({ root: "/tmp/test-ar", project: "test" });
await ar.capture("test q", "test a");
const entry = await ar.journalRead();
```

---

**Phase 5: Build the CLI (2-3 hours)**

*Deliverables:*
- `packages/cli/` with the `ar` command
- All commands listed in section 4
- JSON output by default
- `--help` for all commands
- 5 CLI test files

*Key files to create:*
- `/Users/tongwu/Projects/AgentRecall/packages/cli/package.json`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/tsconfig.json`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/index.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/read.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/write.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/capture.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/list.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/search.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/walk.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/palace.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/awareness.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/insight.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/init.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/projects.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/rollup.ts`
- `/Users/tongwu/Projects/AgentRecall/packages/cli/src/commands/lint.ts`
- 5 test files in `packages/cli/test/`

*Verification:* `npm run build -w packages/cli && npm test -w packages/cli`. Manual test: `node packages/cli/dist/index.js projects` returns JSON.

---

**Phase 6: Integration Testing, Docs, Publish (2-3 hours)**

*Deliverables:*
- Full integration test: MCP server + SDK + CLI all reading/writing the same data directory
- README.md for each package
- Updated root README.md with architecture diagram
- npm publish of all 4 packages
- `npx agent-recall-mcp` still works after publish
- `npx @agent-recall/cli projects` works
- Old `mcp-server/` directory removed (replaced by `packages/mcp-server/`)

*Verification:*
1. `npm run build && npm run test` at root -- all tests pass
2. `npm pack --dry-run` on each package -- correct files included
3. Publish to npm
4. In a fresh directory: `npx agent-recall-mcp --list-tools` works
5. In a fresh directory: `npm init -y && npm i agent-recall && node -e "const {AgentRecall} = require('agent-recall')"` works

---

### Trade-Off Analysis

**Decision 1: Monorepo with npm workspaces vs. separate repos**

- **Chose:** Monorepo with npm workspaces
- **Pros:** Atomic commits across packages, shared tsconfig, single CI, easy refactoring
- **Cons:** More complex initial setup
- **Alternative rejected:** Separate repos per package -- too much coordination overhead for a single developer

**Decision 2: Core as separate package vs. SDK importing MCP server internals**

- **Chose:** Core as separate `@agent-recall/core` package
- **Pros:** SDK has zero MCP dependency (lightweight), clear dependency graph, both MCP and SDK share logic
- **Cons:** Extra package to maintain
- **Alternative rejected:** SDK wrapping MCP server -- would force SDK users to install `@modelcontextprotocol/sdk` (unnecessary bloat)

**Decision 3: `getRoot()` function vs. dependency injection**

- **Chose:** Module-level `setRoot()`/`getRoot()` functions
- **Pros:** Minimal refactoring of existing code (just replace constant with function call), familiar pattern
- **Cons:** Module-level mutable state (but only one value, set once at init)
- **Alternative rejected:** Constructor-based DI through every function -- would require changing every function signature in core, massive refactor

**Decision 4: Tool-logic extraction approach**

- **Chose:** Extract business logic from each tool file into a pure async function in `core/src/tools-logic/`
- **Pros:** SDK and CLI can call the same logic as MCP tools, DRY
- **Cons:** Requires careful extraction of every tool (22 files)
- **Alternative rejected:** SDK re-implementing logic by calling low-level core functions -- would lead to divergence and bugs

**Decision 5: CLI binary name `ar` vs `pj`**

- **Chose:** `ar` (agent-recall)
- **Pros:** Short, memorable, matches the product name, unlikely to conflict
- **Cons:** 2 letters may conflict with `ar` (Unix archive utility) on some systems
- **Mitigation:** The npm bin is scoped to `@agent-recall/cli`, so it installs as `ar` only when globally installed. The Unix `ar` lives at `/usr/bin/ar`, npm bins go to a different PATH location.
