---
description: Squash merge PR and clean up branch
---

# Merge Pull Request

Use this command after verifying the PR is ready to merge.

## Prerequisites

Before merging, ensure ALL of these are complete:
- [ ] Self-review completed (`/self-review`)
- [ ] PR created with self-review in body (`/create-pr`)
- [ ] Fresh Eyes Review posted to PR (`/post-fresh-eyes-review`)
- [ ] All review findings addressed
- [ ] CI checks pass (`/verify-pr-ready`)

## Merge Process

### Step 1: Verify CI Status

Use the repo from CLAUDE.md § GitHub Repository.

```bash
gh pr checks <PR_NUMBER>
```

All checks must show `pass`. If any are pending or failed, wait or fix before proceeding.

### Step 2: Merge the PR

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

**Flags:**
- `--squash` - Squash all commits into one clean commit
- `--delete-branch` - Clean up the feature branch after merge

### Step 3: Update Local Main

```bash
git checkout main && git pull
```

## When NOT to Merge

Do NOT merge if:
- Any CI checks are failing or pending
- Fresh Eyes Review found unaddressed P1/P2 issues
- User explicitly asked to wait for their review
- There are unresolved review comments

## Merge Method

This workflow uses **squash merge** by default:
- Creates a clean, linear history on main
- Single commit per feature/fix
- Easier to revert if needed

## Post-Merge

After merging:
1. Verify the branch was deleted
2. Pull latest main locally
3. Continue with next task or issue
