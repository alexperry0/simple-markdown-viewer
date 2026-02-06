---
description: Mark current issue as blocked and move to next issue
---

# Block Issue

**Mark the current issue as blocked and continue with the next available issue.**

Use this when you hit a blocker that requires human intervention. This keeps the autonomous loop moving.

## When to Block

**BLOCK when:**
- Missing information - Acceptance criteria unclear, need human clarification
- Permission/access needed - Can't access a system, need credentials
- External dependency - Waiting on another issue, third-party API, etc.
- Repeated failures - 3+ different approaches failed with no clear path forward
- Infra/CI outage - Services down, can't verify or deploy
- Policy/Security - Change requires review, approval, or compliance process

**DO NOT block when:**
- Just needs more work or research (keep working)
- Test failures you can debug (fix them)
- Build errors you can fix (fix them)
- You're unsure but haven't tried multiple approaches (try more)

## Workflow

### Step 0: Check Current State

First, verify we're on a feature branch (not main):

```bash
git branch --show-current
```

**If on main:** Skip to Step 4 (comment only - no code to preserve).

**If on feature branch:** Continue to Step 1.

### Step 1: Verify Build Passes

Before committing WIP, the build MUST pass. Run the build command from CLAUDE.md § Build Commands.

**If build passes:** Continue to Step 2.

**If build fails due to YOUR changes:** Fix it or revert to last working state. Do NOT commit broken code.

**If build fails due to EXTERNAL factors** (missing credentials, service down, environment issue):
- This IS the blocker - document it in Step 4
- Stash your changes: `git stash push -m "WIP: blocked by external issue"`
- Note the stash in the blocker comment
- Skip to Step 4

### Step 2: Commit Work-in-Progress

Only if there's meaningful progress to preserve:

```bash
# Stage specific files you changed (avoid 'git add -A' which may stage secrets)
git add <files-you-changed>
git commit -m "wip: [brief description of progress] (#ISSUE_NUMBER)

Work in progress - issue blocked.
See issue for blocker details.

Generated with [Claude Code](https://claude.com/claude-code)"
```

If no meaningful progress, skip the commit.

### Step 3: Push Branch

```bash
git push -u origin <branch-name>
```

### Step 4: Add Blocker Comment to Issue

Post a structured comment explaining the blocker:

```bash
gh issue comment <ISSUE_NUMBER> --body "$(cat <<'EOF'
## Blocked - Needs Human Input

### Blocker Type
<!-- One of: Missing Information | Permission Needed | External Dependency | Repeated Failures | Infra/CI Outage | Policy/Security -->
[TYPE]

### What Was Attempted
- [Approach 1 and why it didn't work]
- [Approach 2 and why it didn't work]
- [etc.]

### Specific Blocker
[Exactly what is blocking progress - be specific]

### Suggested Resolution
[What the human should do to unblock this]

### To Resume
```bash
git checkout <branch-name>
git pull
# If stashed: git stash pop
# Then continue implementation
```

### Work Preserved
<!-- One of: WIP commit on branch | Stashed (git stash pop) | None (blocked before coding) -->
[PRESERVATION_METHOD]

---
*Blocked by Claude Code - autonomous work continuing on other issues*
EOF
)"
```

### Step 5: Add Blocked Label

```bash
# Create label if it doesn't exist
gh label create "blocked" --description "Blocked - needs human input" --color "d73a4a" 2>/dev/null || true

# Add label to issue
gh issue edit <ISSUE_NUMBER> --add-label "blocked"
```

### Step 6: Return to Main

```bash
git checkout main
git pull
```

### Step 7: Continue Autonomous Loop

```bash
/next-issue
```

This will automatically skip blocked issues and pick the next priority item.

## Blocker Types Reference

| Type | Example | Resolution |
|------|---------|------------|
| **Missing Information** | "Issue says 'improve performance' but no metrics defined" | Human clarifies acceptance criteria |
| **Permission Needed** | "Need API key for external service" | Human provides credentials |
| **External Dependency** | "Blocked by issue #123 which must merge first" | Complete dependent issue |
| **Repeated Failures** | "Tried 3 approaches, all fail with same error" | Human investigates root cause |
| **Infra/CI Outage** | "CI service down, can't verify PR" | Wait for service restoration |
| **Policy/Security** | "Change requires security review" | Human handles policy process |

## Usage

```
/block-issue
```

No arguments - operates on current branch/issue context.
