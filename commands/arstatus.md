---
description: "AgentRecall status board — scan all active projects, show pending work, launch context for chosen project."
---

# /arstatus — AgentRecall Project Status Board

The true cold start. One command to see everything in flight across all projects — for both humans choosing what to work on and agents loading briefing context.

## When to Use

**USE THIS FIRST.** Every new session — before /arstart, before any work.

- Opening a new Claude Code tab or starting a fresh agent
- "What was I working on?" after any break
- Orchestrator loading full briefing before dispatching executor agents
- Deciding which project to pick up next

Do NOT go straight to /arstart — /arstart requires you to already know the project. /arstatus tells you what to pick.

## What This Does

Scans every project in `~/.agent-recall/projects/`, reads the latest journal's `## Next` section per project, classifies status, and renders a unified status board card.

## Process

### Step 1: Scan all project directories

```bash
ls ~/.agent-recall/projects/
```

For each subdirectory (project slug), find the latest journal file:

```bash
ls ~/.agent-recall/projects/<slug>/journal/*.md 2>/dev/null \
  | grep -v '\-log\.' \
  | grep -v 'index\.md' \
  | sort -r \
  | head -1
```

Skip any slug that returns no journal files — it's an empty or test directory.

### Step 2: Extract date and Next section

From each journal filename, extract the date (`YYYY-MM-DD` prefix).

Read the file and extract the content under `## Next` — stop at the next `##` heading or EOF. If no `## Next` section exists, use the first non-frontmatter line of the file as fallback.

### Step 3: Classify project status

| Indicator | Status | Condition |
|-----------|--------|-----------|
| `●` | Active | Journal within 7 days AND has a Next item |
| `⚠` | Blocked | Next section contains "Blocked", "blocked on", or "waiting for" |
| `✓` | Complete | Next section contains "feature-complete", "shipped", "done", or "complete" |
| `-` | Stale | Latest journal older than 14 days |

When a project matches both `⚠` and `●`, show `⚠` (blocked takes priority).

### Step 4: Render the status board

Sort order: `⚠` blocked first (needs attention), then `●` active (most recent first), then `✓` complete, then `-` stale.

Special rule: the global catchall project (`tongwu`) goes last — it's less actionable than named project slugs.

```
──────────────────────────────────────────────────────────────
  AgentRecall  Status Board        <YYYY-MM-DD>    <N> projects
──────────────────────────────────────────────────────────────

  1  ⚠ <project-slug>        <YYYY-MM-DD>   BLOCKED
       <Blocked reason — one line, max 80 chars>

  2  ● <project-slug>        <YYYY-MM-DD>
       Next: <Next item — one line, max 80 chars>

  3  ● <project-slug>        <YYYY-MM-DD>
       Next: <Next item — one line, max 80 chars>

  4  ✓ <project-slug>        <YYYY-MM-DD>   complete
       <Status note — one line>

  5  - <project-slug>        <YYYY-MM-DD>   stale
       Last: <last entry summary — one line>

──────────────────────────────────────────────────────────────
  Enter a number, or:
    N  New project (with memory — agent knows your full history)
    X  New project (clean slate — no prior context, pure objectivity)
──────────────────────────────────────────────────────────────
```

Rules for the card:
- Each project is exactly 2 lines: status line (with number) + content line (indented to align under slug)
- Numbers start at 1 and increment continuously across all status groups
- Truncate content to ~80 chars with `…` if longer
- `<N> projects` = total count shown (excluding skipped empties)
- Date column aligns across all rows for readability
- The slug shown in the card is for reference only — the human responds with a number, not the slug name

### Step 5: Respond to selection (interactive sessions only)

Three response types:

**Number (e.g. `3`)** — existing project
Map the number back to the slug from your rendered list. Run `/arstart <slug>` to load full context.

**N — New project with memory**
Ask: "Project name?" → create a new project slug (kebab-case, auto-derived from name).
Call `session_start(project="<new-slug>")` — this loads cross-project insights and awareness from ALL existing projects. The agent starts knowing your full history, preferences, and past decisions. Good for work that builds on or connects to existing projects.

**X — New project, clean slate**
Ask: "Project name?" → note the slug.
Do NOT call session_start. Do NOT load any memory, awareness, or past insights.
Say: "Starting fresh — no prior context loaded. This session is objective."
Good for: code reviewers, audits, independent evaluations, second opinions where past bias would corrupt the output.

If they press Enter or say "skip" — proceed without loading any project context.

**For agents (non-interactive):** Skip Step 5. The status board IS the briefing. Read the numbered list, identify the highest-priority project, and proceed.

## Important Rules

- **Scan fresh every time.** Never cache — journal files are written every session.
- **Skip empty slugs silently.** Don't show projects with no journal files.
- **No MCP calls needed.** This is a pure filesystem read — fast, no network, no API.
- **Global project last.** The `tongwu` catchall slug shows at the bottom of the board.
- **One command, full picture.** Do not split this across multiple steps or ask clarifying questions before rendering.
- **For orchestrators:** Parse the board and dispatch executor agents per project. Each executor receives its project's "Next" item as the task brief.
