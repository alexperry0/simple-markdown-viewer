# Acceptance Criteria Standard

This guide defines how to write high-quality acceptance criteria that enable accurate, autonomous AI implementation.

## Why This Matters

When AI agents implement features from issue descriptions, acceptance criteria serve as the **implementation contract**:

- **Vague criteria** → incomplete implementations, missed edge cases, rework
- **Specific criteria** → accurate implementations, verifiable completeness

The nuances discussed during issue creation **must** make it to the issue itself in a structured, testable format.

## The GIVEN/WHEN/THEN Format

Every acceptance criterion follows this pattern:

```
GIVEN [precondition/state]
WHEN [action/trigger]
THEN [specific observable result with values]
```

This format is:
- **Testable**: Can be directly translated to unit/integration tests
- **Self-contained**: Understandable without reading the full issue
- **LLM-friendly**: Can be extracted as a standalone implementation checklist

## Quality Checklist

Each criterion should pass these checks:

| Check | Question | Example |
|-------|----------|---------|
| **Specific** | Does it mention field names, values, or counts? | `Status = "active"` not "status is set" |
| **Observable** | Can the result be verified? | "returns `{ count: 5 }`" not "handles correctly" |
| **Atomic** | Does it test one thing? | Split "saves and sends email" into two criteria |
| **Complete** | Are all edge cases covered? | Include null/empty/error cases |

## Examples

### Bad (Vague)

```
- [ ] User can create items
- [ ] List auto-populates with data
- [ ] Data is properly synced
```

Problems:
- No preconditions - what state triggers this?
- No specific values - what counts as "properly"?
- Not testable - how do we verify?

### Good (Specific)

```
### UI Flow
- [ ] **AC-1**: GIVEN user is on the main page, WHEN page loads,
      THEN the item list displays with a "Create New" button visible

- [ ] **AC-2**: GIVEN user clicked "Create New", WHEN they fill in required fields and submit,
      THEN a new item appears in the list with status "Active"

### Data Model
- [ ] **AC-3**: GIVEN Item entity, THEN it has fields:
      `Name` (string, required), `Status` (enum), `CreatedAt` (DateTime)

### Regression Prevention
- [ ] **AC-4**: GIVEN existing item list functionality,
      WHEN user views existing items,
      THEN display is identical to before this change (no UI regressions)
```

## Organizing Criteria by Area

Group criteria by functional area for clarity:

```
### [Area 1: UI/Flow]
- [ ] AC-1: ...
- [ ] AC-2: ...

### [Area 2: Data Model]
- [ ] AC-3: ...

### [Area 3: External Integration]
- [ ] AC-4: ...

### Regression Prevention
- [ ] AC-N: ...
```

Always include a **Regression Prevention** section to explicitly preserve existing behavior.

## Coverage Patterns

### CRUD Operations
```
- [ ] GIVEN valid input, WHEN Create called, THEN record persisted with [specific fields]
- [ ] GIVEN record exists, WHEN Read called with id, THEN returns record with [specific shape]
- [ ] GIVEN record exists, WHEN Update called, THEN [specific fields] modified
- [ ] GIVEN record exists, WHEN Delete called, THEN record removed and [cascades]
```

### Error Handling
```
- [ ] GIVEN [invalid state], WHEN [action], THEN [specific error] returned
- [ ] GIVEN [network failure], WHEN [action], THEN [fallback behavior]
```

### Integration Points
```
- [ ] GIVEN external API returns [specific response], WHEN [method] called,
      THEN [specific transformation]
```

## Workflow Integration

### Issue Creation (`/next-issue`)
When reading an issue, evaluate AC quality:
- If vague, improve criteria before implementation
- If missing areas, add criteria for completeness

### Deferred Issues (`/create-deferred-issues`)
New issues from deferred items must follow this format.

### PR Review
Reviewers should verify:
- All acceptance criteria are testable
- Implementation satisfies each criterion
- No criteria are missing tests

## Quick Reference

```
GIVEN [precondition]        ← State before action
WHEN [action]               ← The trigger/event
THEN [observable result]    ← Verifiable outcome with specifics

Bad:  "User can save data"
Good: "GIVEN form with valid email, WHEN Save clicked, THEN User.Email = input value"

Bad:  "Error handling works"
Good: "GIVEN network timeout, WHEN API called, THEN returns fallback from cache"
```
