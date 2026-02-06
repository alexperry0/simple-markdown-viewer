---
description: Create PR with required template format
---

# Create Pull Request

**Use the PR template format below. All sections are required.**

## Prerequisites

- Self-review completed (`/self-review` passed)
- All changes committed
- Build passes (run build command from CLAUDE.md § Build Commands)
- On a feature branch (not main!)

## Step 1: Verify Prerequisites

```bash
# Confirm not on main
git branch --show-current

# Confirm all changes committed
git status
```

## Step 2: Push Branch

```bash
git push -u origin <branch-name>
```

## Step 3: Create PR Using Template

Use the repo from CLAUDE.md § GitHub Repository.

```bash
gh pr create --title "[type]: [description] (#[issue])" --body "$(cat <<'EOF'
## Closes #[ISSUE_NUMBER]

## Summary
- [First change]
- [Second change]
- [Third change if applicable]

## Self-Review

### Checklist Verified
- [x] Security (secrets, injection, auth bypass)
- [x] Correctness (logic errors, null refs, race conditions)
- [x] Logic flow (control flow, state transitions, algorithms)
- [x] User impact (functionality, performance)
- [x] Best practices (error handling, architecture)

### Findings
**Issues Found:** None (or list specific findings with file:line references)

**Suggestions for Future:** None (or list non-blocking improvements)

### Self-Review Status
- [x] Ready for external review - No blocking issues found

## Test Plan
- [x] Build succeeds
- [x] [Specific testing performed]

---
Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

## Required PR Body Elements

Every PR body MUST include:

| Section | Purpose | Example |
|---------|---------|---------|
| Closes # | Links to issue for auto-close | #123 |
| Summary | 1-3 bullet points of changes | - Added feature X |
| Checklist | All 5 areas verified | [x] for each |
| Findings | Issues found or "None" | None |
| Self-Review Status | Ready or needs fixes | Ready |
| Test Plan | What was tested | Build, manual test |

## Common Mistakes to AVOID

1. Writing just "## Summary" without self-review section
2. Leaving checkboxes unchecked (should all be [x])
3. Missing the "Closes #" issue link
4. Not including specific test plan steps

## Next Step

After PR is created, run `/post-fresh-eyes-review` to run independent review.
