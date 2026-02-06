---
description: Run complete PR workflow (review, push, merge)
---

# Ship (Complete PR Workflow)

**Run the entire PR workflow from self-review to merge in one command.**

See [CLAUDE.md workflow](../../CLAUDE.md#critical-rules) for the authoritative workflow definition.

This command orchestrates: `/self-review` → `/create-pr` → `/post-fresh-eyes-review` → `/create-deferred-issues` → `/verify-pr-ready` → `/merge-pr`

## Automated Enforcement (Hooks Active)

This workflow is protected by automated hooks:

| Hook | What It Does | Blocks? |
|------|-------------|---------|
| **bash-safety.py** | Prevents push to main, force push | Yes |
| **security-check.py** | Scans for hardcoded secrets, SQL injection | Yes |
| **validate-pr-template.py** | Ensures PR has all required sections | Yes |
| **validate-self-review.py** | Warns if checklist incomplete | Warns |
| **require-fresh-eyes-review.py** | Blocks merge without independent review | Yes |

## Agent Review

### During Self-Review (Step 1)

**If available**, run the code-reviewer agent to check CLAUDE.md guidelines:

```
Use Task tool with subagent_type: pr-review-toolkit:code-reviewer
```

**Optional agents** (run only when relevant and available):

| When To Use | Agent |
|-------------|-------|
| Complex logic, error handling | `pr-review-toolkit:silent-failure-hunter` |
| New types/models added | `pr-review-toolkit:type-design-analyzer` |

If these agents are not available, proceed without them — self-review and Fresh Eyes Review provide sufficient coverage.

## Prerequisites

- All changes committed to a feature branch (not main!)
- Build passes locally (run build command from CLAUDE.md § Build Commands)
- Tests pass (if test framework configured — check CLAUDE.md § Build Commands)

## Workflow Steps

Execute each step in sequence. **STOP and fix issues before continuing if any step fails.**

### Step 1: Self-Review

Perform self-review using the Self-Reviewer persona.

**Read and follow:** `.claude/commands/self-review.md`

**Decision Point:**
- No issues found → Continue to Step 2
- Issues found → Fix them, commit, restart from Step 1

### Step 2: Create PR

Push branch and create PR with template.

**Read and follow:** `.claude/commands/create-pr.md`

**ENFORCED:** The `validate-pr-template.py` hook will BLOCK PR creation if the template is incomplete.

### Step 3: Post Fresh Eyes Review

Run Fresh Eyes Review and post findings to PR. **ALWAYS post findings first** (creates audit trail).

**Read and follow:** `.claude/commands/post-fresh-eyes-review.md`

Fresh Eyes Review uses a **separate Claude agent with no conversation context** to provide independent verification.

**Decision Point:**
- No P1/blocking issues → Continue to Step 4
- P1/blocking issues found → Fix them, **return to Step 1** (self-review fixes!), push, re-run Fresh Eyes Review

### Step 4: Create Deferred Issues

If any items were deferred (not fixed in this PR), create GitHub issues.

**Read and follow:** `.claude/commands/create-deferred-issues.md`

**When to skip:** No deferred items (all findings were addressed)

### Step 5: Verify PR Ready

Check CI status and confirm PR is ready.

**Read and follow:** `.claude/commands/verify-pr-ready.md`

**Decision Point:**
- CI passes, no blockers → Continue to Step 6
- CI fails → Fix, commit, push, wait for CI

### Step 6: Merge PR

Squash merge, delete branch, pull main.

**Read and follow:** `.claude/commands/merge-pr.md`

### Step 7: Cleanup (Optional)

Clean up any stale local branches. If `commit-commands` plugin is available:

```
/commit-commands:clean_gone
```

## Quick Reference

```
/ship workflow:

    ┌─────────────────────────────┐
    │ Self-Review                 │ validate-self-review.py
    │ + code-reviewer agent       │ (if available)
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Create PR                   │ validate-pr-template.py (BLOCKS)
    │                             │ bash-safety.py (BLOCKS push to main)
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Fresh Eyes Review           │ ─── P1? ─── Fix → Self-Review → Re-run
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Create Deferred Issues      │
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Verify CI                   │ ─── Fails? ─── Fix & Wait
    └──────────┬──────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ Merge!                      │ require-fresh-eyes-review.py
    └─────────────────────────────┘
```

## Error Recovery

| Problem | Solution |
|---------|----------|
| Self-review finds issues | Fix in code, commit, restart `/ship` |
| PR template blocked | Add missing sections, try again |
| Push to main blocked | Create feature branch, push there |
| Security issue blocked | Remove hardcoded secrets, use env vars |
| Merge blocked (no review) | Run `/post-fresh-eyes-review`, then retry merge |
| Fresh Eyes finds P1/blocking | Fix issues, **return to Step 1** (self-review fixes!), push, re-run |
| CI fails | Fix, commit, push, run `/verify-pr-ready` again |
| Merge conflicts | Rebase on main, push (creates new commits), restart from Step 5. If push is rejected, ask user for confirmation to force push. |

## Usage

```
/ship
```

No arguments needed. Claude will execute each step and hooks will enforce compliance.
