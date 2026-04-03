# agent-recall-mcp

> Persistent memory for AI agents. Session state that survives restarts, handoffs, and cold starts.

[![npm](https://img.shields.io/npm/v/agent-recall-mcp?style=flat-square)](https://www.npmjs.com/package/agent-recall-mcp)
[![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)](https://github.com/Goldentrii/AgentRecall/blob/main/LICENSE)
[![MCP](https://img.shields.io/badge/MCP-9_tools-orange?style=flat-square)](#tools)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green?style=flat-square)](#requirements)

**agent-recall-mcp** is an MCP server that gives any AI agent persistent session memory, alignment detection, and cross-session intelligence. Works with Claude Code, Cursor, VS Code Copilot, Windsurf, Claude Desktop, and any MCP-compatible client.

**Zero cloud. Zero telemetry. All data stays on your machine.**

---

## Why AgentRecall?

| Problem | How AgentRecall solves it |
|---------|--------------------------|
| Agent forgets everything between sessions | Three-layer memory persists state across sessions |
| Cold-start costs 2,000-5,000 tokens of context | Agent reads structured journal in ~200 tokens |
| Human says one thing, agent builds another | Alignment checks measure the understanding gap |
| Human contradicts a past decision unknowingly | Nudge protocol surfaces the contradiction |
| Multi-agent handoff loses context | Machine-readable state transfers cleanly between agents |

---

## Quick Start

### Claude Code

```bash
claude mcp add agent-recall -- npx -y agent-recall-mcp
```

### Cursor

`.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "agent-recall": {
      "command": "npx",
      "args": ["-y", "agent-recall-mcp"]
    }
  }
}
```

### VS Code

`.vscode/mcp.json`:
```json
{
  "servers": {
    "agent-recall": {
      "command": "npx",
      "args": ["-y", "agent-recall-mcp"]
    }
  }
}
```

### Windsurf / Claude Desktop / Other MCP Clients

Add as an MCP server with command: `npx -y agent-recall-mcp`

---

## Tools

9 MCP tools across three categories:

### Journal (Session Memory)

| Tool | Description |
|------|-------------|
| `journal_read` | Read entry by date or `"latest"`. Filter by section (`brief`, `qa`, `completed`, `status`, `blockers`, `next`, `decisions`, `reflection`, `files`, `observations`). |
| `journal_write` | Append to or replace today's journal. Target a specific section or use `replace_all` for full overwrite. |
| `journal_capture` | Lightweight Layer 1 Q&A capture — one question + answer pair, tagged, timestamped. |
| `journal_list` | List recent entries for a project (date, title, momentum). |
| `journal_search` | Full-text search across all journal entries. Filter by section. |
| `journal_projects` | List all tracked projects on this machine. |

### Alignment (Intelligent Distance)

| Tool | Description |
|------|-------------|
| `alignment_check` | Record what the agent understood, its confidence level, assumptions, and any human correction. Measures the understanding gap over time. |
| `nudge` | Surface a contradiction between the human's current input and a prior decision. Helps the human clarify their own thinking. |

### Synthesis (Cross-Session Intelligence)

| Tool | Description |
|------|-------------|
| `context_synthesize` | Generate L3 semantic synthesis — goal evolution, decision history, active blockers, recurring patterns, and contradiction detection across sessions. |

---

## Three-Layer Memory Architecture

```
L1: Working Memory    [per-turn, ~50 tokens]    "What happened"
    |  synthesized into
L2: Episodic Memory   [daily journal, ~800 tok]  "What it means"
    |  synthesized into
L3: Semantic Memory   [cross-session, ~200 tok]  "What's true across sessions"
    (contradiction detection + goal evolution tracking)
```

Each layer serves a different consumer:
- **L1** captures raw events as they happen (fast, append-only)
- **L2** structures the day's work into a navigable journal (agent reads this on cold start)
- **L3** synthesizes patterns across sessions (detects contradictions, tracks goal drift)

---

## Resources

Two MCP resources for browsing without tool calls:

| URI Pattern | Description |
|-------------|-------------|
| `agent-recall://{project}/index` | Project journal index |
| `agent-recall://{project}/{date}` | Specific journal entry |

---

## Project Auto-Detection

When `project = "auto"` (default), the server resolves the project by:

1. `AGENT_RECALL_PROJECT` env var
2. Git remote origin -> repo name
3. Git root directory -> basename
4. `package.json` -> `name` field
5. Basename of current working directory

---

## Storage

```
~/.agent-recall/                    (or $AGENT_RECALL_ROOT)
+-- config.json
+-- projects/
    +-- {project-slug}/
        +-- journal/
            +-- index.md              <- auto-generated index
            +-- YYYY-MM-DD.md         <- L2: daily journal
            +-- YYYY-MM-DD-log.md     <- L1: raw Q&A capture
            +-- YYYY-MM-DD-alignment.md <- alignment checks + nudges
```

**Legacy support**: automatically reads existing journals from `~/.claude/projects/*/memory/journal/`. New writes go to `~/.agent-recall/`.

---

## CLI

```bash
npx agent-recall-mcp              # Start MCP server (stdio)
npx agent-recall-mcp --help       # Show help
npx agent-recall-mcp --list-tools # List all 9 tools as JSON
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AGENT_RECALL_ROOT` | `~/.agent-recall` | Storage root directory |
| `AGENT_RECALL_PROJECT` | (auto-detect) | Override project slug |

---

## Requirements

- Node.js >= 18
- Dependencies: `@modelcontextprotocol/sdk`, `zod`

---

## Part of AgentRecall

This MCP server is one component of the [AgentRecall](https://github.com/Goldentrii/AgentRecall) ecosystem:

- **[SKILL.md](https://github.com/Goldentrii/AgentRecall/blob/main/SKILL.md)** — Claude Code skill with Think-Execute-Reflect quality loops
- **[agent-recall-mcp](https://www.npmjs.com/package/agent-recall-mcp)** — This MCP server (works with any MCP agent)
- **[Intelligent Distance Protocol](https://github.com/Goldentrii/AgentRecall/blob/main/docs/intelligent-distance-protocol.md)** — The underlying theory

---

## Feedback & Contributing

- Issues & PRs: [github.com/Goldentrii/AgentRecall](https://github.com/Goldentrii/AgentRecall)
- Email: tongwu0824@gmail.com

---

## License

MIT — [Tongwu](https://github.com/Goldentrii)
