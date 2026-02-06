---
description: Run Fresh Eyes Review and post findings to the PR
---

# Post Fresh Eyes Review to PR

**CRITICAL: Use the template from `.claude/templates/fresh-eyes-review-comment.md` EXACTLY.**

**CRITICAL: ALWAYS POST FINDINGS FIRST. Even if the review finds bugs, POST the findings to the PR FIRST. This creates an audit trail. Then read the comment from the PR, fix issues, and return to self-review.**

## What is Fresh Eyes Review?

Fresh Eyes Review achieves independent verification by:
- Using a **separate Claude agent with NO conversation context**
- The agent only sees the diff, not the implementation discussion
- This eliminates author bias and catches things the implementing agent missed

## Prerequisites

- You must be on the feature branch (not main)
- A PR must already exist for this branch
- Build must pass before running Fresh Eyes Review

## Step 1: Gather Required Values

```bash
# Get commit SHA for template links
COMMIT_SHA=$(git rev-parse HEAD)

# Get PR number
PR_NUMBER=$(gh pr view --json number --jq '.number')
```

## Step 2: Run Fresh Eyes Review

Use the Task tool to spawn a fresh context agent:

```
Use Task tool with:
  subagent_type: "pr-review-toolkit:code-reviewer" (preferred) or "Explore"
  model: "opus" (recommended for review quality)
  prompt: |
    You are performing a Fresh Eyes Review. You have NO context about why
    this code was written - only the diff speaks.

    1. Run: git diff main...HEAD
    2. Review using the Fresh Eyes Reviewer persona
    3. Categorize findings as P1 (blocking), P2 (serious), P3 (quality)
    4. Only report findings with >=70% confidence

    Focus on: Security, Correctness, Logic flow, User impact, Best practices.

    If you find NO issues, say "No P1/P2/P3 issues identified."
```

From the agent output, note:
- **MODEL_ID**: The model used (e.g., claude-sonnet-4-20250514)
- **FINDINGS**: The categorized issues found
- **STATUS**: Ready to merge / Needs changes / Re-review needed

## Step 3: Post Using Template

Use the template from `.claude/templates/fresh-eyes-review-comment.md` and fill in all variables.

Post to PR:
```bash
gh pr comment $PR_NUMBER --body "[filled template]"
```

## Step 4: Read Comment and React

After posting, **read the comment from the PR** (as if you were an external reviewer):

**If P1/blocking issues found:**
1. Fix the issues locally
2. Return to self-review (re-review the fixes!)
3. Push fixes
4. Re-run Fresh Eyes Review
5. Post new findings to PR (repeat this process)

**If only deferred items remain:**
1. Create GitHub issues to capture the feedback (see `/create-deferred-issues`)
2. Proceed to verify CI and merge

## Why Fresh Context Works

The value of independent review comes from:
1. **No author bias** - Fresh agent doesn't know why decisions were made
2. **Only the diff speaks** - Intent must be clear from the code itself
3. **Same rigorous checklist** - Consistent quality standards
4. **Different perspective** - Catches what the author's familiarity missed

## Common Mistakes to AVOID

1. Using the implementing agent instead of spawning a fresh one
2. Writing your own template instead of using the one in `.claude/templates/`
3. Fixing bugs WITHOUT posting findings first (breaks audit trail)
4. Skipping self-review when fixing Fresh Eyes findings
5. Not creating issues for deferred items (loses feedback)
