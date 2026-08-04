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
npm test                    # Unit tests (node:test, Node 20+)
npm run tauri:dev           # Desktop dev mode with hot reload (needs Rust)
npm run dev:web             # Frontend only, in a browser at localhost:5173
npm run tauri:build         # Production desktop build
```

---

## Project Overview

**Tally** — a lightweight, local-first calorie & workout tracker, built with Tauri.
(This repo was previously a markdown viewer; it has been fully repurposed.)

Users log foods to meals (with real nutrition data from public food databases),
log strength/cardio workouts, and see daily budgets and 14-day trends.

**Core principles:**
- **Local-first** — all data in localStorage; JSON export/import for backup. No accounts, no server.
- **Lightweight** — Tauri + system webview; vanilla JS, no frameworks, no build step
- **Pluggable food data** — USDA FoodData Central (keyless via DEMO_KEY), Nutritionix (restaurant coverage, free key), Open Food Facts (keyless). MyFitnessPal has no public API.

## Architecture

```
src/
├── index.html              # App shell (header, tabs, view containers)
├── styles.css              # Design system, light/dark via prefers-color-scheme
├── js/
│   ├── app.js              # UI layer: diary, workouts, trends, settings, modals
│   ├── store.js            # Persistence (injected storage backend) — pure, tested
│   ├── nutrition.js        # Date helpers + calorie/macro math — pure, tested
│   └── providers.js        # Food-database search/parsers — pure parsers, tested
src-tauri/
├── src/                    # Minimal Tauri shell (no custom Rust commands)
├── tauri.conf.json         # Window config + CSP (allowlists the food API hosts)
tests/                      # node:test suites with API response fixtures
```

- **Frontend**: Vanilla HTML/CSS/JS ES modules rendered in the webview; also runs in any browser.
- **Backend (Rust/Tauri)**: Bare shell only — file access isn't needed; food APIs are called with `fetch` from the frontend (CSP `connect-src` allowlists them).
- **Testing**: `store.js`, `nutrition.js`, `providers.js` take injected storage/fetch so they run under `node --test` with mocks/fixtures. UI is exercised by a Playwright smoke script (not checked in; drive `npm run dev:web`).

## Dependencies

- **Tauri** — Desktop shell (system webview + Rust backend); no other Rust deps
- **No runtime JS dependencies** — the frontend is dependency-free vanilla JS
- **Food data APIs** (network, from the frontend): USDA FoodData Central, Nutritionix v2, Open Food Facts

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
