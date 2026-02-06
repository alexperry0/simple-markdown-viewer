---
description: Auto-select and start work on next highest priority issue
---

# Next Issue (Autonomous Issue Selection)

**Automatically select the next highest priority issue and start working on it.**

## How It Works

This command enables autonomous backlog processing by:
1. Querying open issues sorted by priority
2. Selecting the highest priority issue not currently in progress
3. Creating a feature branch
4. Starting implementation

## Priority Order

Issues are selected in this priority order:

1. **priority: critical** - Blockers, production issues
2. **priority: high** - Important features, significant bugs
3. **priority: medium** - Standard features, improvements
4. **No priority label** - Backlog items
5. **priority: low** - Nice-to-haves, minor improvements

Within the same priority level, prefer issues with:
- `ux` label (user-facing improvements)
- `product` label (core functionality)
- Lower issue number (older issues first)

## Exclusions

Skip issues that have:
- `blocked` label (use `/block-issue` to mark, human removes when resolved)
- `needs-discussion` label
- `documentation` label (unless no other issues)
- Already have an open PR

## Getting Stuck?

If you hit a blocker that requires human input, use `/block-issue` to:
1. Commit WIP (if build passes)
2. Document the blocker on the issue
3. Add `blocked` label
4. Return to main and continue with `/next-issue`

**Do NOT sit idle waiting for human input.** Block and move on.

## Workflow

### Step 1: Check Current State (Recovery)

First, check if we're mid-work or starting fresh:

```bash
git status --porcelain
git branch --show-current
```

**If on a feature branch with uncommitted changes:**
- We were interrupted mid-work
- Review what was being done and either complete it or stash

**If on a feature branch with clean state:**
- Check if PR exists: `gh pr list --head $(git branch --show-current)`
- If PR exists, run `/ship` to complete it
- If no PR, continue implementation or run `/ship`

**If on main with clean state:**
- Ready for new issue, proceed to Step 2

### Step 2: Query Open Issues

```bash
gh issue list --state open --json number,title,labels,assignees --limit 50
```

### Step 3: Select Highest Priority

Apply priority ordering and exclusions to select the best candidate.

**Output to user:**
```
Selected: #[NUMBER] - [TITLE]
Priority: [PRIORITY]
Labels: [LABELS]
```

### Step 4: Verify Clean State

Ensure we're ready to start new work:

```bash
git status --porcelain  # Should be empty
git branch --show-current  # Should be main
```

### Step 5: Create Branch

```bash
git checkout main
git pull origin main
git checkout -b <type>/<issue#>-<short-description>
```

Branch naming:
- `feat/` for new features, enhancements
- `fix/` for bug fixes
- `refactor/` for code improvements
- `test/` for test additions
- `chore/` for maintenance

### Step 6: Read Full Issue

```bash
gh issue view <number>
```

**CRITICAL:** Read the FULL issue description, not just the title. Understand:
- Acceptance criteria
- Technical requirements
- Related issues or context

### Step 6.5: Evaluate Acceptance Criteria Quality

**Before implementing, assess the acceptance criteria.**

See [Acceptance Criteria Guide](../guides/acceptance-criteria.md) for the full standard.

**Quality Check:**
- Are criteria in GIVEN/WHEN/THEN format?
- Are they specific (field names, values, counts)?
- Are they testable (observable results)?
- Are regression cases covered?

**If criteria are vague or missing:**

1. **Improve them** - Add missing criteria based on your understanding
2. **Update the issue** - `gh issue edit <number> --body "...improved criteria..."`
3. **Comment** - Note what you improved and why

**Do NOT start implementation with vague criteria.** The time spent improving criteria saves 3x in rework.

### Step 7: Create Implementation Plan (For Non-Trivial Issues)

**For issues that are NOT trivial single-file changes, create a plan before coding.**

Criteria for when to plan:
- Multiple files will be modified
- Architectural decisions needed
- Multiple valid implementation approaches exist
- New patterns or abstractions required

**Skip planning for:**
- Single-file changes under 50 lines
- Bug fixes with obvious root cause
- Copy-paste from existing pattern with only name changes
- Documentation-only changes

### Step 8: Begin Implementation

Start working on the issue.

## Quick Reference

```
/next-issue workflow:

    ┌─────────────────────────────┐
    │ Check git state (recovery)  │ ← Mid-work or fresh start?
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Query open issues           │
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Apply priority ordering     │
    │ - critical > high > medium  │
    │ - Exclude blocked/docs      │
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Verify clean git state      │ ─── Dirty? ─── /ship or stash
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Create feature branch       │
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Read full issue details     │
    │ + Evaluate AC quality       │
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Non-trivial? → Create plan  │
    │ Trivial? → Skip to impl    │
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Begin implementation        │
    └─────────────────────────────┘
```

## Continuous Work Mode

After completing an issue (via `/ship`), run `/next-issue` to continue through the backlog:

```
/ship → /next-issue → [plan if needed] → implement → /ship → ...
```

## Override Selection

If you want to work on a specific issue instead:

```
/next-issue #145
```

This skips priority selection and starts work on the specified issue.

## Usage

```
/next-issue          # Auto-select highest priority
/next-issue #140     # Work on specific issue
```
