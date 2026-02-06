# AI-Assisted Development

You write an issue. The AI reads it. It picks up the work, writes the code, reviews its own work, creates a pull request, and merges it. Then it picks the next issue.

## Two Parts

**Part One: Product Management**

Good issues become good code. Bad issues become bugs and rework.

The AI needs what any developer needs: clear requirements, understood priority, and enough context to make decisions. The product manager's job is to give it those things.

**Part Two: Development**

The AI works in a loop. It picks an issue from the backlog. It reads the requirements. It writes the code. It reviews its own work. It creates a pull request. It runs another review. It merges the code. Then it picks the next issue.

The loop continues until the backlog is empty or you tell it to stop.

[Read the Developer Guide](developer/README.md)

## What the Human Does

The human does three things:

1. **Writes issues.** Clear requirements with acceptance criteria.
2. **Sets priority.** Which issues matter most.
3. **Watches.** Or doesn't. The AI will keep working.

You can intervene at any point. You can review the pull request before it merges. You can reject the AI's work and give feedback. You can take over and finish the work yourself.

But you don't have to.

## What the AI Does

The AI does everything else:

- Reads the issue and understands the requirements
- Explores the codebase to find where changes belong
- Writes the code
- Writes the tests
- Reviews its own work for bugs and security issues
- Creates a pull request with full documentation
- Runs independent review with a fresh context agent
- Fixes any issues found
- Merges when everything passes
- Moves to the next issue

## Trust but Verify

The AI makes mistakes. So do humans. The workflow includes multiple review steps:

1. **Self-review.** The AI checks its own work against a checklist.
2. **Agent review.** Specialized review agents look for specific problems (if available).
3. **Fresh Eyes Review.** A separate AI reviews the code with fresh context — no knowledge of why decisions were made.
4. **CI checks.** Automated tests and builds must pass (if configured).

Each layer catches different problems. Together they catch most problems.

You can add human review as another layer. The workflow supports it. But the workflow does not require it.

## Getting Started

If you want to understand the development loop: [Developer Guide](developer/README.md)

If you want the detailed reference, see the directories under `.claude/`: [guides/](guides/), [hooks/](hooks/), [personas/](personas/), [agents/](agents/)

---

*This workflow is a framework for AI-assisted development. It can run fully autonomous or with human checkpoints at any step.*
