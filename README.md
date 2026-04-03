# AgentRecall

> Agent memory that survives every session. Alignment detection that catches misunderstanding before it becomes wrong work.

[![npm](https://img.shields.io/npm/v/agent-recall-mcp?style=flat-square)](https://www.npmjs.com/package/agent-recall-mcp)
[![Version](https://img.shields.io/badge/version-2.1.3-blue?style=flat-square)](https://github.com/Goldentrii/AgentRecall)
[![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-9_tools-orange?style=flat-square)](mcp-server/)
[![Protocol](https://img.shields.io/badge/protocol-Intelligent_Distance_v1-5B2D8E?style=flat-square)](docs/intelligent-distance-protocol.md)

---

## What is AgentRecall?

**AgentRecall** is a persistent memory system for AI agents built on the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). It solves two problems:

1. **Session amnesia** — agents forget everything between sessions. AgentRecall gives them structured, persistent memory with three layers (working, episodic, semantic).
2. **The Intelligent Distance gap** — humans and AI misunderstand each other structurally. AgentRecall detects misalignment and contradictions before they become wasted work.

It works with **any MCP-compatible agent**: Claude Code, Cursor, VS Code Copilot, Windsurf, Claude Desktop, and more.

**Zero cloud. Zero telemetry. All data stays local.**

---

## Install

```bash
# Claude Code (one command)
claude mcp add agent-recall -- npx -y agent-recall-mcp

# Cursor — .cursor/mcp.json
{ "mcpServers": { "agent-recall": { "command": "npx", "args": ["-y", "agent-recall-mcp"] } } }

# VS Code — .vscode/mcp.json
{ "servers": { "agent-recall": { "command": "npx", "args": ["-y", "agent-recall-mcp"] } } }
```

For Claude Code, also install the skill for Think-Execute-Reflect quality loops:

```bash
mkdir -p ~/.claude/skills/agent-recall
curl -o ~/.claude/skills/agent-recall/SKILL.md \
  https://raw.githubusercontent.com/Goldentrii/AgentRecall/main/SKILL.md
```

Say **"save"** to journal. Say **"read the latest journal"** to resume.

---

## How It Works

### Three-Layer Memory

```
L1: Working Memory    [per-turn, ~50 tokens]    "What happened"
    |  synthesized into
L2: Episodic Memory   [daily journal, ~800 tok]  "What it means"
    |  synthesized into
L3: Semantic Memory   [cross-session, ~200 tok]  "What's true across sessions"
```

- **L1** captures raw events as they happen (fast, append-only Q&A pairs)
- **L2** structures each day into a navigable journal with sections (brief, decisions, blockers, next steps)
- **L3** synthesizes across sessions: detects contradictions, tracks goal evolution, surfaces recurring patterns

### Alignment Detection

When an agent isn't sure it understands:

```
ALIGNMENT CHECK:
- Goal: Build a REST API for user management
- Confidence: medium
- Assumptions: PostgreSQL, no auth yet, CRUD only
- Unclear: Should this include role-based access?
```

### Contradiction Nudging

When the agent detects the human contradicts a prior decision:

```
NUDGE:
- You decided Clerk for auth on March 25.
- Now you're asking for custom auth from scratch.
- Has the goal changed, or should we stick with Clerk?
```

---

## 9 MCP Tools

| Category | Tool | What it does |
|----------|------|-------------|
| **Journal** | `journal_read` | Read entry by date or "latest", filter by section |
| | `journal_write` | Append to or replace today's journal |
| | `journal_capture` | Lightweight L1 Q&A capture |
| | `journal_list` | List recent entries |
| | `journal_search` | Full-text search across history |
| | `journal_projects` | List all tracked projects |
| **Alignment** | `alignment_check` | Record confidence, assumptions, corrections |
| | `nudge` | Surface contradiction with past decisions |
| **Synthesis** | `context_synthesize` | L3 cross-session intelligence |

Full tool reference: [mcp-server/README.md](mcp-server/README.md)

---

## The Ecosystem

| Component | Purpose | For whom |
|-----------|---------|----------|
| **[agent-recall-mcp](https://www.npmjs.com/package/agent-recall-mcp)** | MCP server — 9 tools for memory, alignment, synthesis | Any MCP agent |
| **[SKILL.md](SKILL.md)** | Claude Code skill — Think-Execute-Reflect quality loops | Claude Code users |
| **[Intelligent Distance Protocol](docs/intelligent-distance-protocol.md)** | Theory & protocol spec | Protocol implementers |
| **[MCP Adapter Spec](docs/mcp-adapter-spec.md)** | MCP integration design | Tool builders |
| **[SDK Design](docs/sdk-design.md)** | Programmatic API design | SDK developers |

---

## Real Results

Validated over 20+ sessions across production projects:

| Metric | Before | After |
|--------|--------|-------|
| Cold-start context load | ~5 min | ~2 seconds |
| Decision history retained | 0% | 100% |
| Misunderstandings caught pre-work | 0 | 4 in first week |
| Code review gaps caught by quality loop | 0 | 4 in first week |

---

## The Intelligent Distance Problem

**The obvious problem:** AI agents forget everything between sessions.

**The real problem:** Humans and AI misunderstand each other — structurally, repeatedly, expensively. Humans contradict themselves, communicate in fragments, say "make it better" when they mean 10 different things. AI interprets literally and builds the wrong thing with perfect confidence.

**Memory solves forgetting. AgentRecall solves misunderstanding.**

[Read the full protocol spec](docs/intelligent-distance-protocol.md)

---

## Agent-Readable Quick Reference

<!-- AGENT: Start here for fast integration -->

```yaml
package: agent-recall-mcp
install: npx -y agent-recall-mcp
protocol: MCP (stdio transport)
tools: 9 (journal_read, journal_write, journal_capture, journal_list, journal_search, journal_projects, alignment_check, nudge, context_synthesize)
resources: agent-recall://{project}/index, agent-recall://{project}/{date}
storage: ~/.agent-recall/projects/{slug}/journal/
env:
  AGENT_RECALL_ROOT: ~/.agent-recall (override storage location)
  AGENT_RECALL_PROJECT: auto-detected (override project slug)
auto-detection: AGENT_RECALL_PROJECT > git remote > git root > package.json name > cwd basename
sections: brief, qa, completed, status, blockers, next, decisions, reflection, files, observations
cold-start: journal_read({ project: "auto", date: "latest" })
save: journal_write({ project: "auto", content: "..." })
legacy: reads ~/.claude/projects/*/memory/journal/ (writes to ~/.agent-recall/)
```

<!-- /AGENT -->

---

## Contributing

1. **Use the protocol** for a week, then [report your experience](https://github.com/Goldentrii/AgentRecall/issues)
2. **Implement it** in a new agent — PRs welcome
3. **Improve the spec** — [protocol doc](docs/intelligent-distance-protocol.md)

## Feedback

- GitHub: [github.com/Goldentrii/AgentRecall](https://github.com/Goldentrii/AgentRecall)
- Email: tongwu0824@gmail.com

## License

MIT — Concept & Design: [Tongwu](https://github.com/Goldentrii)
