# agent-recall SDK — Architecture & Package Design

> **Status**: Design Draft v0.1 · Author: Goldentrii · Date: 2026-03-24
>
> This document defines the SDK that lets any developer — regardless of AI tool —
> integrate agent-recall into their workflow. "SDK is a must." — tongwu

---

## Design Philosophy

The SDK wraps the same journal format used by the SKILL.md (Claude Code) and the
MCP server — one storage format, three access layers:

```
┌─────────────────────────────────────────────────────────────┐
│                       User Interfaces                        │
│                                                              │
│   SKILL.md          MCP Server           SDK / CLI          │
│  (Claude Code)   (Cursor/Windsurf)   (Python · Node · CLI)  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Core Layer  │
                    │  (journal/   │
                    │  format +   │
                    │  file I/O)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Storage   │
                    │ ~/.project- │
                    │  journal/   │
                    └─────────────┘
```

---

## Package Structure

### Python package: `agent-recall`

```
pip install agent-recall
```

**Namespace**: `project_journal`

```python
from project_journal import Journal

j = Journal()                         # auto-detects current project
j = Journal(project="taskflow")       # explicit project name

# Read
brief = j.brief()                     # cold-start 3-sentence summary
entry = j.read(date="latest")         # full latest journal
entry = j.read(date="2026-03-24")     # specific date
section = j.read(section="blockers")  # specific section

# Write (Layer 1)
j.capture("What auth library?", "Chose Clerk — Vercel-native, auto env vars")

# Write (Layer 2)
j.save()    # triggers full 9-section journal generation (AI-assisted via API)
j.save(content="<markdown>")   # direct write, no AI call

# Browse
sessions = j.list()           # list all entries
results = j.search("Clerk")   # full-text search
```

### Node.js package: `agent-recall`

```
npm install agent-recall
```

```typescript
import { Journal } from 'agent-recall'

const j = new Journal()                    // auto-detect project
const j = new Journal({ project: 'taskflow' })

// Same API surface as Python
const brief = await j.brief()
const entry = await j.read({ date: 'latest' })
await j.capture('Why Neon?', 'Serverless Postgres, branching, Vercel-native')
await j.save()
const sessions = await j.list()
```

---

## CLI

Both packages install the same CLI command: `pj`

```bash
# Read
pj read                      # latest journal (full)
pj read --date 2026-03-20    # specific date
pj read --section blockers   # specific section
pj brief                     # cold-start brief only (fast, low token)

# Write
pj capture "question" "answer"    # Layer 1: quick capture
pj save                           # Layer 2: generate full journal (interactive)
pj save --message "Implemented auth with Clerk, decided against Auth0"

# Browse
pj list                      # list entries (most recent first)
pj list --project taskflow   # specific project
pj search "Clerk"            # full-text search

# Setup
pj init                      # initialize agent-recall for current repo
pj projects                  # list all tracked projects
pj migrate                   # migrate from ~/.claude/skills/agent-recall/journal/

# MCP server
pj mcp                       # start the MCP server (stdio)
pj mcp --http --port 4040    # start HTTP MCP server
```

---

## Journal Class — Full API Reference

### `Journal(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `project` | `string` | auto-detected | Project slug |
| `root` | `string` | `~/.agent-recall` | Journal root directory |
| `language` | `"en" \| "zh" \| "auto"` | `"auto"` | Journal language |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `brief(date?)` | `string` | Cold-start summary (3 sentences + momentum) |
| `read(opts?)` | `JournalEntry` | Read a journal entry |
| `capture(q, a, tags?)` | `void` | Layer 1: append Q&A to daily log |
| `save(content?)` | `JournalEntry` | Layer 2: write full journal |
| `list(limit?)` | `JournalMeta[]` | List available entries |
| `search(query, opts?)` | `SearchResult[]` | Full-text search |
| `today()` | `string` | Today's entry date (YYYY-MM-DD) |
| `exists(date?)` | `boolean` | Check if entry exists |

### `JournalEntry`

```typescript
interface JournalEntry {
  date: string          // YYYY-MM-DD
  project: string       // project slug
  momentum: string      // emoji momentum indicator
  brief: string         // 3-sentence cold-start summary
  sections: {
    qa: string          // section 一: Q&A
    completed: string   // section 二: completed work
    status: string      // section 三: project status
    blockers: string    // section 四: blockers
    next: string        // section 五: next actions
    decisions: string   // section 六: decisions
    reflection: string  // section 七: reflection
    files: string       // section 八: files & commands
    observations: string // section 九: machine observations
  }
  raw: string           // full markdown content
}
```

---

## AI-Assisted Save

`j.save()` without content triggers AI-assisted journal generation — it reads the
raw Layer 1 log from the current session and uses a prompt template to generate
the full 9-section journal.

This requires an AI provider configured in `~/.agent-recall/config.json`:

```json
{
  "ai": {
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "api_key_env": "ANTHROPIC_API_KEY"
  }
}
```

If no AI provider is configured, `j.save()` opens an editor with the journal template
pre-filled, and the user completes it manually. This is the zero-dependency path.

**Note**: When used inside Claude Code with SKILL.md installed, AI-assisted save
is handled by the agent itself — no API key needed. The SDK's AI save is for
non-Claude Code environments.

---

## Installation & Setup

### Python

```bash
pip install agent-recall
pj init              # creates ~/.agent-recall/ and links current repo
```

### Node.js

```bash
npm install -g agent-recall     # global for CLI
npm install agent-recall        # local for API use in projects
pj init
```

### From source (development)

```bash
git clone https://github.com/Goldentrii/agent-recall
cd agent-recall

# Python
cd sdk/python && pip install -e ".[dev]"

# Node
cd sdk/node && npm install && npm link
```

---

## Monorepo Structure (implementation target)

```
agent-recall/                     ← GitHub repo root
├── README.md                        ← main README (already done)
├── SKILL.md                         ← Claude Code skill (already done)
│
├── sdk/
│   ├── python/
│   │   ├── pyproject.toml
│   │   ├── project_journal/
│   │   │   ├── __init__.py          ← Journal class
│   │   │   ├── core.py              ← file I/O, format parsing
│   │   │   ├── cli.py               ← `pj` CLI entry point
│   │   │   └── ai.py                ← AI-assisted save (optional)
│   │   └── tests/
│   │
│   └── node/
│       ├── package.json
│       ├── src/
│       │   ├── index.ts             ← Journal class
│       │   ├── core.ts              ← file I/O, format parsing
│       │   ├── cli.ts               ← `pj` CLI entry point
│       │   └── ai.ts                ← AI-assisted save (optional)
│       └── tests/
│
├── mcp/
│   ├── package.json                 ← agent-recall-mcp
│   └── src/
│       ├── server.ts                ← MCP server (see mcp-adapter-spec.md)
│       └── tools.ts
│
├── docs/
│   ├── mcp-adapter-spec.md          ← (this file's sibling)
│   └── sdk-design.md                ← this file
│
└── journal/                         ← agent-recall's own journal (dogfooding)
    ├── index.md
    └── 2026-03-24.md
```

---

## Versioning & Release Strategy

| Layer | Package | Version | Release |
|-------|---------|---------|---------|
| Claude Code skill | `SKILL.md` | 1.0.0 | Manual copy / clawhub.ai |
| Python SDK | `agent-recall` on PyPI | 0.1.0 | `pip install agent-recall` |
| Node SDK | `agent-recall` on npm | 0.1.0 | `npm install agent-recall` |
| MCP server | `agent-recall-mcp` on npm | 0.1.0 | `npx agent-recall-mcp` |

All packages share the same version number. Releases are tagged `v{version}` on GitHub.

---

## Implementation Priority

```
Phase 1 (v0.1) — Core CLI
├── Python: pj read, pj capture, pj list, pj brief
├── Storage: ~/.agent-recall/ layout
└── Migration: pj migrate (import existing SKILL.md journals)

Phase 2 (v0.2) — MCP Server
├── Node: agent-recall-mcp (stdio transport)
├── Tools: journal_read, journal_write, journal_capture, journal_list
└── IDE configs: .cursor/mcp.json, .windsurf/mcp.json templates

Phase 3 (v0.3) — AI-Assisted Save
├── AI provider config
├── Auto-generate 9-section journal from Layer 1 log
└── Fallback: open editor with template

Phase 4 (v1.0) — Production Ready
├── Node SDK (matches Python API surface)
├── HTTP MCP transport
├── Full test coverage
└── Published to PyPI + npm
```

---

## Open Questions

| # | Question | Lean | Notes |
|---|----------|------|-------|
| 1 | Single PyPI name `agent-recall` or scoped `goldentrii-agent-recall`? | Unscoped | More discoverable; claim early |
| 2 | Python-first or Node-first for v0.1? | Python | Broader data/ML audience; `pip install` is what tongwu mentioned |
| 3 | AI save: require API key or use local LLM (Ollama)? | Optional both | API key for cloud, Ollama for local-only users |
| 4 | `pj` CLI name conflict? | Low risk | Check npm + PyPI before publishing |
| 5 | dogfood: use agent-recall to track agent-recall development? | Yes | Demonstrates the tool, validates the workflow |
