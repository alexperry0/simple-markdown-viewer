---
description: Prioritize issues for upcoming milestones
---

# Prioritize (Release Planning)

**Analyze open issues and recommend priority order based on milestones.**

## Purpose

When planning toward a release, this command helps answer: "What should I work on next?" by considering:
- Release timeline and milestones
- Issue priority labels and dependencies
- Feature completeness for user-facing flows
- Risk assessment (what breaks the release if missing?)

## Parameters

```
/prioritize                           # Use current milestone context
/prioritize --milestone 2026-03-01    # Override milestone date
/prioritize --count 10                # Show top 10 instead of 5
```

## How It Works

### Step 1: Gather Issues

```bash
gh issue list --state open --json number,title,labels,body --limit 100
```

### Step 2: Categorize by Release Criticality

**Must-Have** (required for milestone):
- Core user flows working end-to-end
- Blocking bugs fixed
- Critical security or data integrity issues

**Should-Have** (important but not blocking):
- Edge case handling
- Performance issues
- Polish and consistency

**Nice-to-Have** (can wait):
- Enhancement requests
- Documentation
- Tech debt without user impact

### Step 3: Apply Priority Matrix

| Label | Weight |
|-------|--------|
| `priority: critical` | 100 |
| `priority: high` | 80 |
| `priority: medium` | 50 |
| `priority: low` | 20 |
| `blocked` | -100 |
| `size:small` | +10 |
| `size:large` | -5 |

### Step 4: Consider Dependencies

Check if issues are:
- Part of an epic (prioritize epic completion over scattered work)
- Blocking other issues (do blockers first)
- Related to in-progress work (momentum matters)

### Step 5: Output Recommendations

Format output as:

```
## Release Priorities

### Top 5 for Next Sprint

| # | Issue | Priority | Size | Rationale |
|---|-------|----------|------|-----------|
| 1 | #12 - [Title] | high | medium | [Why this first] |
| 2 | #15 - [Title] | medium | small | [Why this next] |
| ... | ... | ... | ... | ... |

### Blockers (must complete before milestone)
- #12 - [why it blocks]

### Recommended Exclusions
- #20 - [why it can wait]
```

## Integration with /next-issue

After running `/prioritize`, update the priority labels on issues if needed:

```bash
gh issue edit <number> --add-label "priority: high" --remove-label "priority: medium"
```

Then `/next-issue` will automatically pick up the newly prioritized work.

## Usage

```
/prioritize                    # Default
/prioritize --count 10         # More recommendations
```
