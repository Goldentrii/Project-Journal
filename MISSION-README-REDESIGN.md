# Mission: AgentRecall README Redesign (Option B)

## For: Fresh Agent (no prior context)
## From: Orchestrator (tongwu's main agent)
## Date: 2026-04-18

---

## Background

AgentRecall is a persistent memory system for AI agents. It's a TypeScript monorepo with 4 packages:

| Package | npm name | What it is |
|---------|----------|------------|
| `packages/core` | `agent-recall-core` | Core engine — memory storage, recall, classification, corrections |
| `packages/mcp-server` | `agent-recall-mcp` | MCP server — 5 tools for Claude Code, Cursor, etc. |
| `packages/sdk` | `agent-recall-sdk` | JS/TS SDK — use AgentRecall in any app without MCP |
| `packages/cli` | `agent-recall-cli` | CLI — `ar` command for shell usage |

**Current version:** 3.3.18 (just published).

**GitHub:** https://github.com/Goldentrii/AgentRecall (240+ stars)

---

## The Problem

There are 3 README files that are out of sync:

| File | Lines | Role |
|------|-------|------|
| `/README.md` (root) | 1429 | GitHub landing page + npm page for `agent-recall-mcp` |
| `/packages/core/README.md` | 1299 | npm page for `agent-recall-core` |
| `/packages/mcp-server/README.md` | 1299 | npm page for `agent-recall-mcp` |

**Current state:** Root README was updated with Phase 2-4 features (ambient recall hooks, multi-label tags, corrections store, honest benchmark caveat). Package READMEs are 130 lines behind — they're stale copies from before v3.3.18.

**The user wants Option B:** Instead of copying the full 1429-line README to all packages, make each package README focused on ITS audience. The root stays comprehensive. Package READMEs are short and focused.

---

## Your Mission

### Step 1: Backup Old READMEs

Before any changes, copy the current package READMEs to backup files:
```bash
cp packages/core/README.md packages/core/README-pre-redesign.md
cp packages/mcp-server/README.md packages/mcp-server/README-pre-redesign.md
```

### Step 2: Read the Root README

Read `/README.md` (the full 1429-line version). This is the source of truth. Understand:
- What features exist (5 MCP tools, 3 commands, hooks, digest cache, Obsidian, etc.)
- The bilingual structure (EN + CN)
- Badge system
- Benchmark section
- Architecture section
- SDK API section

### Step 3: Redesign `packages/mcp-server/README.md`

This is what people see on **npmjs.com/package/agent-recall-mcp**. The audience is:
- Claude Code / Cursor / Copilot users
- Want to install and use MCP tools
- Don't need SDK API details or CLI reference

**Target: 200-300 lines. Structure:**

1. **Hero** — same tagline, relevant badges only (MCP version, tools count, zero cloud, token savings)
2. **Quick Start** — one-command install for Claude Code
3. **Three Commands** — `/arsave`, `/arstart`, `/arsaveall` with one-line descriptions
4. **Auto Hooks** — `hook-start`, `hook-end`, `hook-correction`, `hook-ambient` — explain these fire automatically
5. **5 MCP Tools** — table with name + one-line description
6. **How Memory Compounds** — short version (5-step compounding flow)
7. **Benchmarked Savings** — the A/B table (WITH the honest caveat)
8. **Architecture** — brief diagram showing MCP server → core → local markdown files
9. **Links** — "Full docs: [main README](../../README.md) | [SDK API](../core/README.md)"
10. **Bilingual** — short CN section mirroring the above

**Do NOT include:** Full SDK API reference, CLI command reference, detailed scoring math, full benchmark methodology.

### Step 4: Redesign `packages/core/README.md`

This is what people see on **npmjs.com/package/agent-recall-core**. The audience is:
- Developers building apps WITH AgentRecall (LangChain, CrewAI, custom agents)
- Want the SDK API, not MCP setup
- Technical users who want to call functions directly

**Target: 200-300 lines. Structure:**

1. **Hero** — same tagline, SDK-relevant badges (SDK version, zero cloud, license)
2. **What This Is** — "Core engine. Use this if you're building with the SDK, not MCP."
3. **Install** — `npm install agent-recall-core`
4. **SDK API Quick Reference** — key exported functions in table format:
   - `sessionStart()`, `smartRemember()`, `smartRecall()`, `sessionEnd()`, `check()`
   - `writeCorrection()`, `readP0Corrections()`, `generateTags()`
   - Type signatures for each
5. **Example** — one short code example showing session lifecycle
6. **Scoring Architecture** — brief: RRF + Ebbinghaus + Beta (link to root for details)
7. **Links** — "MCP server: [agent-recall-mcp](../mcp-server/README.md) | Full docs: [main README](../../README.md)"
8. **Bilingual** — short CN section

**Do NOT include:** MCP tool descriptions, CLI reference, benchmark tables, installation for Claude Code.

### Step 5: Update Root README

Minor updates to the root README:
- Update badge: `MCP-5_tools` → `MCP-6_tools` if tool count changed (verify from mcp-server source)
- Ensure Phase 2-4 features are mentioned (hooks, tags, corrections)
- Add links to package-specific READMEs in the docs section

### Step 6: Verify

After all changes:
1. Check all relative links work: `../../README.md`, `../core/README.md`, etc.
2. Verify badge versions match current published versions (core@3.3.18, mcp@3.3.18, cli@0.1.10)
3. Run: `cd packages/core && npm pack --dry-run | grep README` — confirm README is included
4. Run: `cd packages/mcp-server && npm pack --dry-run | grep README` — confirm README is included

---

## Key Files

| File | Action |
|------|--------|
| `/README.md` | Read (source of truth), minor updates |
| `/packages/core/README.md` | Backup + rewrite |
| `/packages/mcp-server/README.md` | Backup + rewrite |
| `/packages/mcp-server/src/server.ts` | Read to verify tool count |
| `/packages/core/src/index.ts` | Read to verify exported functions |
| `/UPDATE-LOG.md` | Read for Phase 2-4 feature list |

---

## Constraints

- **Do NOT publish to npm.** Just write the READMEs. Publishing is a separate step.
- **Do NOT modify any TypeScript code.** This is a docs-only mission.
- **Backup before overwriting.** The user explicitly asked for this.
- **Keep bilingual structure.** EN first, then CN section. Both must mirror.
- **All changes are LOCAL only.** Commit but do not push.
- **Honest benchmarks.** Include the caveat: "These are modeled estimates, not long-term production data."

---

## Success Criteria

After the redesign:
- Someone installing `agent-recall-mcp` via npm sees a clean, focused 200-300 line README about MCP tools + hooks + commands
- Someone installing `agent-recall-core` via npm sees SDK API reference + code examples
- Someone visiting the GitHub repo sees the full comprehensive README
- All three are consistent in branding and badges
- Old READMEs are backed up as `README-pre-redesign.md`
