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
# Replace with your project's build commands
dotnet build                # Build
dotnet test                 # Test
dotnet run                  # Run
```

---

## Project Overview

<!-- Describe your project here -->

## Architecture

<!-- Describe your architecture, key components, and patterns here -->

## Configuration

<!-- Describe configuration files, environment variables, secrets handling -->

## Dependencies

<!-- List key dependencies -->

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
