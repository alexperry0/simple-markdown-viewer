# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

**Hierarchy**: This file is authoritative. Guide files (`.claude/guides/*.md`) elaborate but never contradict. If there's a conflict, this file wins.

---

## Quick Start (Read This First)

**For most tasks, you need these 3 things:**

1. **Don't push to main** - All changes go through Pull Requests.
2. **Test appropriately** - Bug fix → regression test. New logic → unit test. Trivial → none.
3. **Workflow**: `Write code → Commit locally → /ship`

**Don't push to main. Don't skip self-review.**

---

## Critical Rules

### 1. NEVER PUSH DIRECTLY TO MAIN
All changes must go through a Pull Request. Before ANY `git push`, verify: `git branch --show-current` must NOT be "main".

### 2. ALWAYS FOLLOW THE WORKFLOW
```
Write code → Commit locally → /self-review → Fix if needed → Push → /create-pr → /post-fresh-eyes-review → /create-deferred-issues → /verify-pr-ready → /merge-pr
```
Or use `/ship` to run the full workflow. Self-review happens AFTER local commit, BEFORE push.

### 3. TEST APPROPRIATELY
Every meaningful code change needs tests appropriate to the change:

| Change Type | Test Required |
|-------------|---------------|
| Bug fix | Regression test proving fix |
| New logic | Unit test |
| Service method | Unit + integration |
| UI component | UI test |
| Trivial (typo, formatting) | None |

<!-- Add project-specific architecture rules here -->

---

## GitHub Repository

**Owner:** `alexperry0`
**Repo:** `simple-markdown-viewer`
**Full path:** `alexperry0/simple-markdown-viewer`
**URL:** https://github.com/alexperry0/simple-markdown-viewer

---

## Build Commands

```bash
npm install                 # Install dependencies
npm run tauri dev           # Dev mode with hot reload
npm run tauri build         # Production build
```

---

## Project Overview

A lightweight desktop markdown viewer built with Tauri. The motivation is simple: existing tools for viewing markdown files are bloated editors when all you need is a fast, reliable reader. This app opens `.md` files and renders them beautifully — nothing more, nothing less.

**Core principles:**
- **Read-only by design** — this is a viewer, not an editor
- **Lightweight** — Tauri + system webview, not a full Chromium install
- **Fast** — opens instantly, renders immediately
- **Live** — watches the file on disk and re-renders on change

## Architecture

```
src/
├── index.html              # Main window markup
├── styles.css              # Markdown rendering styles
├── main.js                 # Frontend logic (rendering, file handling)
src-tauri/
├── src/
│   └── main.rs             # Tauri backend (file I/O, file watching, window management)
├── Cargo.toml              # Rust dependencies
├── tauri.conf.json         # Tauri configuration
package.json                # Node dependencies (dev tooling)
```

- **Frontend**: Vanilla HTML/CSS/JS. Markdown parsed and rendered in the webview.
- **Backend (Rust/Tauri)**: Handles file reading, file system watching, and native dialogs.
- **No frameworks**: No React, no bundler beyond what Tauri provides.

## Dependencies

- **Tauri** — Desktop shell (system webview + Rust backend)
- **marked** (or similar) — Markdown-to-HTML parsing
- **highlight.js** — Code block syntax highlighting
- **notify** (Rust crate) — File system watching

---

## Autonomous Work Mode

```
/next-issue -> implement -> /ship -> repeat
```

`/next-issue` auto-selects highest priority open issue (critical > high > medium > low), creates branch, begins work.

## Detailed Guides

These guides elaborate on rules defined above. They provide implementation details but do not override this file.

| Guide | Purpose |
|-------|---------|
| [**Git Workflow**](.claude/guides/git-workflow.md) | Branching, commits, PR process |
| [**Acceptance Criteria**](.claude/guides/acceptance-criteria.md) | GIVEN/WHEN/THEN format for issues |
