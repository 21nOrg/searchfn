# conduct-dry-run - Generate execution plan

You are an AI agent using Conduct v0.1 to generate a detailed execution plan without making changes.

## Your Task

Create a comprehensive plan for implementing a spec, but don't execute it yet.

## Steps

### 1. Load Spec

```bash
cat _conduct/specs/{id}.v0.spec.md
```

### 2. Analyze Requirements

Break down the spec into:
- Phases (if multi-phase)
- Tasks per phase
- Files to create/modify/delete
- Dependencies
- Risks

### 3. Estimate Effort

For each task:
- Time estimate
- Complexity (simple/medium/complex)
- Dependencies

### 4. Create Execution Plan

```markdown
# Dry Run: Spec {id}

## Meta
- **Spec ID:** {id}
- **LOE Estimate:** {hours} hours
- **Phases:** {count}
- **Risk Level:** Low|Medium|High
- **Agent:** {name}
- **Generated:** {timestamp}

## Overview

{Brief summary of what will be implemented}

## Execution Plan

### Phase 1: {Name} ({hours}h)

**Tasks:**
1. Create `src/file1.ts` - {description} (30m)
2. Modify `src/file2.ts` - {description} (1h)
3. Add tests in `tests/file1.test.ts` (45m)

**Dependencies:**
- None / Package X / Feature Y

**Risks:**
- Risk 1 and mitigation
- Risk 2 and mitigation

**Files:**
- Create: 3 files
- Modify: 2 files
- Delete: 0 files

### Phase 2: {Name} ({hours}h)

{Same structure}

## Features Affected

- auth - Will modify login flow
- users - Will add new fields

## Testing Strategy

- Unit tests: {count} new tests
- Integration tests: {count} scenarios
- Manual testing: {areas to test}

## Potential Issues

1. **Issue 1**
   - Impact: High|Medium|Low
   - Mitigation: ...

2. **Issue 2**
   - Impact: ...
   - Mitigation: ...

## Timeline

- Phase 1: {start} → {end}
- Phase 2: {start} → {end}
- Total: {duration}

## Resources Needed

- API docs for X
- Access to Y
- Review from Z

## Decision Points

Points where user input might be needed:
1. Choice between approach A vs B
2. Trade-off decision on performance vs simplicity

## Go/No-Go Recommendation

**Recommendation:** Proceed|Review|Block

**Reasoning:** {why}
```

### 5. Review with User

Present the plan:

```
📋 Dry Run Complete

📊 Estimate: 8 hours (Medium complexity)

🔍 Plan:
  • Phase 1: Database (2h)
  • Phase 2: API (3h)
  • Phase 3: Tests (2h)
  • Phase 4: Docs (1h)

⚠️ Risks: 2 identified, mitigations planned

🎯 Features: auth, users

💡 Recommendation: Proceed

📄 Full plan: _conduct/plans/spec-{id}-plan.md
```

### 6. Save Plan

Save as: `_conduct/plans/spec-{id}-plan.md`

## Output Formats

**Summary View:**
- Quick overview
- Total time
- Phase count
- Go/no-go

**Detailed View:**
- Full breakdown
- All tasks
- All risks
- Complete timeline

## Use Cases

1. **Before starting work** - Understand scope
2. **For estimation** - How long will this take?
3. **For review** - Is this the right approach?
4. **For planning** - When can we start?

## Notes

- Be realistic with estimates
- Identify risks early
- Consider dependencies
- Think about testing
- Document assumptions
- Get user buy-in before executing
