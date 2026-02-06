# Commands Reference

Every command, explained in one line.

## The Loop

| Command | What it does |
|---------|--------------|
| `/next-issue` | Pick the highest priority issue and start working |
| `/ship` | Review, create PR, run external review, merge |

These two commands are all you need for autonomous work.

## Individual Steps

| Command | What it does |
|---------|--------------|
| `/self-review` | Review current changes using self-reviewer checklist |
| `/create-pr` | Push branch and create pull request with full template |
| `/post-fresh-eyes-review` | Run independent review and post findings to PR |
| `/verify-pr-ready` | Check that CI passes and PR is ready to merge |
| `/merge-pr` | Squash merge the PR and clean up branch |

## Issue Management

| Command | What it does |
|---------|--------------|
| `/block-issue` | Mark current issue as blocked, document why, move on |
| `/create-deferred-issues` | Turn review findings into new issues for later |
| `/prioritize` | Reorder backlog based on release goals |

## Workflow

```
/next-issue
    │
    ├── Picks issue
    ├── Creates branch
    └── Starts implementation
            │
            └── You implement (or AI continues)
                    │
                    └── /ship
                            │
                            ├── /self-review
                            ├── /create-pr
                            ├── /post-fresh-eyes-review
                            ├── /create-deferred-issues (if needed)
                            ├── /verify-pr-ready
                            └── /merge-pr
                                    │
                                    └── /next-issue (loop continues)
```

## Usage Patterns

**Fully autonomous:**
```
/next-issue
```
AI handles everything. You watch or don't.

**Semi-autonomous:**
```
/next-issue          # AI picks issue, starts work
[you review the PR]  # Human checkpoint
/merge-pr            # AI merges after your approval
```

**Manual with AI assist:**
```
[you write code]
/self-review         # AI checks your work
/create-pr           # AI creates PR
/post-fresh-eyes-review  # AI runs independent review
[you merge]          # You control the merge
```

---

Back to: [Developer Guide](README.md)
