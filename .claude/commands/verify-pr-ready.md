---
description: Verify CI passes and PR is ready to merge
---

# Verify PR Ready

Final verification before declaring a PR ready to merge.

## Prerequisites

- PR created with self-review in body
- Fresh Eyes Review posted as PR comment
- All review findings addressed

## Instructions

### Step 1: Get PR Number

```bash
gh pr view --json number --jq '.number'
```

### Step 2: Check CI Status

```bash
# Check CI status
gh pr checks <PR_NUMBER>

# Or view on GitHub
gh pr view <PR_NUMBER> --web
```

All checks must pass before proceeding.

### Step 3: Verify Fresh Eyes Review Posted

```bash
# List PR comments to confirm review findings are posted
gh pr view <PR_NUMBER> --comments
```

Confirm:
- [ ] Fresh Eyes Review comment exists
- [ ] Uses proper template with workflow/persona links
- [ ] Status is marked (Ready/Needs Changes)

### Step 4: Verify Self-Review in PR Body

```bash
gh pr view <PR_NUMBER> --json body --jq '.body'
```

Confirm PR body includes:
- [ ] Issue link (Closes #XX)
- [ ] Summary bullets
- [ ] Self-Review section with checklist
- [ ] Test plan

### Step 5: Final Checklist

Before declaring ready to merge:

- [ ] Local build passes (run build command from CLAUDE.md § Build Commands)
- [ ] CI checks pass (all green) — if CI is configured
- [ ] PR body includes detailed self-review
- [ ] Fresh Eyes Review posted as PR comment (not just run locally)
- [ ] All review findings addressed (fixed or justified)
- [ ] PR body updated if issues were fixed after initial push

## Output

If all checks pass:

```markdown
## PR #<number> Ready for Merge

### Verification Complete
- [x] Build passes locally
- [x] CI checks pass (or N/A if not configured)
- [x] Self-review in PR body
- [x] Fresh Eyes Review posted as comment
- [x] All findings addressed

**Status:** Ready for merge
```

If checks fail, note what needs to be fixed and which workflow step to return to.
