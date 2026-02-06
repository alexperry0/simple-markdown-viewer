# Developer Guide

The AI works in a loop. It picks an issue, implements it, ships it, and picks the next one.

This guide explains what happens at each step.

## Pick Issue

The AI queries the backlog and selects the highest priority issue that is not blocked.

Priority order:
1. Critical
2. High
3. Medium
4. No label
5. Low

It skips issues marked `blocked` or `needs-discussion`.

Once selected, it creates a branch and reads the full issue.

**Command:** `/next-issue`

## Implement

The AI reads the acceptance criteria. It explores the codebase to understand where changes belong. It writes the code. It writes tests if the criteria require them.

The AI follows patterns it finds in the codebase. It does not invent new architectures unless asked.

If the AI gets stuck, it can mark the issue as blocked, document the problem, and move to the next issue. It does not wait for help.

**Command:** `/next-issue` starts this automatically

## Review

Before pushing code, the AI reviews its own work.

### Self-Review

The AI reviews its own changes using the self-reviewer checklist. It checks:

- **Security** — No secrets exposed, no injection vulnerabilities
- **Correctness** — Logic is right, edge cases handled
- **User impact** — Nothing broken, errors are friendly
- **Best practices** — Code is clean, patterns followed

If it finds problems, it fixes them and reviews again.

**Command:** `/self-review`

### Agent Review (If Available)

Specialized agents examine the code for specific issues:

| Agent | What it checks |
|-------|----------------|
| `code-reviewer` | Quality, clarity, robustness, maintainability |
| `plan-reviewer` | Architectural plan soundness (zero context) |
| `ux-reviewer` | Usability, accessibility, UX quality |
| `engineering-manager` | Epic orchestration, parallel development |
| `product-manager` | Requirements, work item structure |

Plugin agents (if installed):

| Agent | What it checks |
|-------|----------------|
| `pr-review-toolkit:code-reviewer` | Guidelines and patterns |
| `pr-review-toolkit:silent-failure-hunter` | Error handling gaps |
| `pr-review-toolkit:type-design-analyzer` | Data structure design |

Built-in agents live in `.claude/agents/`. Plugin agents are installed separately.

## Ship

The AI pushes the code, creates a pull request, and runs external review.

### Create PR

The pull request includes:
- Link to the issue it closes
- Summary of changes
- Self-review results
- Test plan

**Command:** `/create-pr`

### External Review

A separate review agent examines the code with fresh context. This provides an independent perspective. Different contexts catch different problems.

If the review finds blocking issues, the AI fixes them and runs review again. It does not merge until reviews pass.

**Command:** `/post-fresh-eyes-review`

### Deferred Issues

If the review identified non-blocking improvements, the AI creates GitHub issues to capture them. This ensures feedback is not lost without blocking the current PR.

**Command:** `/create-deferred-issues`

### Verify CI

The AI checks that CI passes and there are no blockers before merging.

**Command:** `/verify-pr-ready`

### Merge

When reviews pass and CI is green, the AI merges the pull request. It uses squash merge to keep history clean.

Then it returns to Pick Issue.

**Command:** `/merge-pr`

## The Full Command

One command runs the entire ship process:

```
/ship
```

This runs: self-review → create PR → external review → deferred issues → verify CI → merge

## Running the Loop

To start autonomous work:

```
/next-issue
```

The AI will:
1. Select the highest priority issue
2. Create a branch
3. Implement the solution
4. Run `/ship`
5. Return and run `/next-issue` again

The loop continues until you stop it or the backlog is empty.

## Human Intervention

You can intervene at any point:

| To do this | Do this |
|------------|---------|
| Review before merge | Watch the PR, add comments |
| Stop the loop | Tell the AI to stop |
| Take over an issue | Check out the branch, finish it yourself |
| Change priority | Update labels, AI will adjust |
| Block an issue | Add `blocked` label with explanation |

The AI adapts. It does not get frustrated or confused.

## Commands Reference

| Command | What it does |
|---------|--------------|
| `/next-issue` | Pick and start the next issue |
| `/self-review` | Review current changes |
| `/create-pr` | Push and create pull request |
| `/ship` | Full workflow: review → PR → external review → deferred issues → verify → merge |
| `/block-issue` | Mark current issue as blocked, move on |

[Full command reference](commands.md)

---

Next: [Commands Reference](commands.md) — Every command explained
