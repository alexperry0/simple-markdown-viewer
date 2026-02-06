# Git Workflow Guide

## Commit Standards

- Structure: `<type>: <description> (#issue)` or `<type>: <description> (Closes #issue)`
- Examples:
  - `feat: add user profile editing (#123)` - links to issue
  - `fix: resolve null reference in service (Closes #456)` - auto-closes issue on merge
  - `chore: update dependencies` - no issue needed for maintenance
- Common types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`
- Keep commits focused on a single logical change
- Commit often with working, buildable code

## Git Safety Rules

- **Never commit sensitive data**: connection strings, API keys, passwords (use environment variables, `.env` files, or user secrets)
- **Always verify changes before committing**: Review `git status` and `git diff` output
- **Build and test before committing**: Ensure the build succeeds and tests pass (check CLAUDE.md § Build Commands)

## Branching Strategy (GitHub Flow)

### Branch Structure
```
main (protected - requires PR)
  └── feat/123-user-profile
  └── fix/456-null-reference
  └── refactor/789-clean-up-auth
```

### Branch Naming Convention
```
feat/<issue#>-<short-description>      # New features
fix/<issue#>-<short-description>       # Bug fixes
refactor/<issue#>-<short-description>  # Code improvements
docs/<issue#>-<short-description>      # Documentation
test/<issue#>-<short-description>      # Test additions
chore/<description>                    # Maintenance (no issue needed)
```

### Workflow
1. Pick or create a GitHub issue
2. Create branch: `git checkout -b feat/123-description`
3. Make changes with clear commits referencing the issue
4. Push and create PR: `git push -u origin feat/123-description`
5. Run Fresh Eyes Review and post findings to PR
6. Address any P1/blocking issues, re-run review if needed
7. Merge when review passes → Issue auto-closes
8. Delete the feature branch

### Commit Message Format
```bash
# During development (links to issue)
git commit -m "feat: add profile component (#123)"

# Final commit (auto-closes issue when PR merges)
git commit -m "feat: complete user profile (Closes #123)"
```

## Branch Protection (by convention)

- All changes should go through Pull Requests
- At least one Fresh Eyes Review must be posted to the PR before merge
- Wait for CI build to pass (if configured)
- Avoid direct pushes to `main`

*Note: Human review is optional — Fresh Eyes Review provides the quality gate.*
