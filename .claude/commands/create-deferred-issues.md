---
description: Create GitHub issues for deferred review items
---

# Create Deferred Issues

Use this command before merging to capture any feedback that was deferred (not fixed in this PR).

## When to Use

Use this command when:
- Review found issues you're intentionally not fixing in this PR
- Self-review identified improvements that are out of scope
- You're accepting known limitations

## Prerequisites

- PR exists and is ready to merge (P1/blocking issues resolved)
- You have identified deferred items from review or self-review

## Step 1: Identify Deferred Items

Review the comments and self-review notes for any items marked as:
- "Deferred to future PR"
- "Known limitation"
- "Out of scope"
- P2 or lower priority items not being fixed

## Step 2: Create GitHub Issues

For each deferred item, create an issue with **GIVEN/WHEN/THEN acceptance criteria**.

See [Acceptance Criteria Guide](../guides/acceptance-criteria.md) for the full standard.

```bash
gh issue create --title "[type]: [description]" --body "$(cat <<'EOF'
## Context

Identified during code review of PR #[PR_NUMBER].

## Issue

[Description of the deferred item]

## Acceptance Criteria

> Use GIVEN/WHEN/THEN format. See [Acceptance Criteria Guide](../guides/acceptance-criteria.md)

- [ ] **AC-1**: GIVEN [precondition], WHEN [action], THEN [specific observable result]
- [ ] **AC-2**: GIVEN [precondition], WHEN [action], THEN [specific observable result]

### Regression Prevention
- [ ] **AC-N**: GIVEN existing [feature], WHEN [action], THEN behavior unchanged

## Why Deferred

[Reason for not fixing now - e.g., "Out of scope", "Acceptable for now", etc.]

## Source

- **PR:** #[PR_NUMBER]

## Suggested Implementation

[If known, describe approach with specific file names and methods]

---
*Created from code review feedback to ensure nothing is lost.*
EOF
)"
```

**IMPORTANT:** Do not create issues with vague criteria like "fix the bug" or "improve performance". Every issue must have testable, specific acceptance criteria.

## Issue Labeling

Add appropriate labels:
- `enhancement` - for improvements
- `tech-debt` - for code quality items
- `performance` - for performance improvements
- `documentation` - for docs improvements

```bash
gh issue edit [ISSUE_NUMBER] --add-label "enhancement,tech-debt"
```

## Step 3: Reference in PR

Add a comment to the PR noting which issues were created:

```bash
gh pr comment [PR_NUMBER] --body "## Deferred Items

Created issues to capture deferred feedback:
- #[ISSUE_1] - [brief description]
- #[ISSUE_2] - [brief description]

These will be addressed in future PRs."
```

## Next Step

After creating issues, proceed to `/merge-pr`.
