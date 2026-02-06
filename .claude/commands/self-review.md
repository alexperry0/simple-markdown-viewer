---
description: Self-review changes using Self-Reviewer persona
---

# Self-Review

Perform a self-review of current changes using the Self-Reviewer persona before pushing.

## Workflow Context

This happens after local commit, before push. See [CLAUDE.md workflow](../../CLAUDE.md#critical-rules):

```
Write code → Commit locally → /self-review ← YOU ARE HERE → Fix if needed → Push → /create-pr → ...
```

**Key point**: Self-review happens AFTER commit (so there's something to review) but BEFORE push (so fixes stay local).

## Instructions

### Step 1: Verify Build Passes

Run the build command from CLAUDE.md § Build Commands.

If build fails, fix errors before proceeding.

### Step 2: Review Changes

```bash
# See what files changed
git status

# See the diff
git diff --staged  # if staged
git diff           # if not staged
```

### Step 3: Apply Self-Reviewer Persona

Load and apply the [Self-Reviewer persona](../personas/self-reviewer.md).

Review the changes against this checklist:

#### Security
- [ ] No hardcoded secrets, API keys, or connection strings
- [ ] User input is validated and sanitized
- [ ] SQL injection prevented (parameterized queries)
- [ ] Authorization checks present for protected operations
- [ ] Sensitive data not logged or exposed in error messages

#### Correctness
- [ ] Edge cases handled (null, empty, boundary values)
- [ ] Error conditions handled gracefully
- [ ] Async/await used correctly (no fire-and-forget)
- [ ] Resource cleanup (IDisposable, database connections)

#### Logic Flow
- [ ] Control flow is correct (if/else, switch, loops)
- [ ] State transitions are valid
- [ ] Algorithm correctness (off-by-one, boundary conditions)
- [ ] Early returns and guard clauses are complete

#### User Impact
- [ ] Changes don't break existing functionality
- [ ] Performance implications considered
- [ ] Error messages are user-friendly

#### Architecture
Check CLAUDE.md § Critical Rules for project-specific architecture requirements.

### Step 4: Agent Review (If Available)

**If available**, run the code-reviewer agent to check CLAUDE.md guidelines adherence:

```
Use Task tool with subagent_type: pr-review-toolkit:code-reviewer
```

**Optional agents** (run only when relevant and available):

| When To Use | Agent |
|-------------|-------|
| Complex logic, error handling | `pr-review-toolkit:silent-failure-hunter` |
| New types/models added | `pr-review-toolkit:type-design-analyzer` |

If agents are not available, proceed with manual review only.

**Decision Point:**
- No issues found → Continue to Step 5
- Issues found → Fix them, commit, restart from Step 1

### Step 5: Document Findings

If issues found:
1. Fix the issues
2. Rebuild and verify
3. Run `/self-review` again

If no blocking issues:
1. Note any non-blocking suggestions
2. Proceed to `/create-pr`

## Output Format

After completing self-review, document using this structure:

```markdown
## Self-Review Complete

**Status:** [Ready for PR / Issues Found - Fixing]

### Checklist Verified
- [x] Security - [notes]
- [x] Correctness - [notes]
- [x] Logic flow - [notes]
- [x] User impact - [notes]
- [x] Architecture - [notes]

### Agent Findings (if run)
[Summary from code-reviewer agent]

### Findings
[Any issues found, with file:line references]

### Suggestions for Future
[Non-blocking improvements]
```

## Next Step

After self-review passes, run `/create-pr` to create the pull request.
