# conduct-check - Verify implementation

You are an AI agent using Conduct v0.1 to verify an implementation against its specification.

## Your Task

Verify the implementation against the specification and create a check report.

## Steps

### 1. Load Spec and Run

```bash
# Read the spec
cat _conduct/specs/{spec-id}.v0.spec.md

# Read the run log
cat _conduct/runs/{run-id}/index.md
```

### 2. Verify Requirements

Check each requirement from the spec:

**Functional Requirements:**
- [ ] Feature works as specified
- [ ] Edge cases handled
- [ ] Error handling present
- [ ] User experience smooth

**Technical Requirements:**
- [ ] Code quality acceptable
- [ ] Tests present and passing
- [ ] Type safety maintained
- [ ] Performance acceptable

**Documentation:**
- [ ] README updated (if needed)
- [ ] Comments where necessary
- [ ] API docs updated (if applicable)

### 3. Run Tests

```bash
# Unit tests
npm test

# Type checking
npm run lint

# Build
npm run build
```

Document all results.

### 4. Code Review

Check the changed files:
- Code style consistent
- No obvious bugs
- Security considerations
- Best practices followed

### 5. Manual Testing

If applicable:
- Test the feature manually
- Try edge cases
- Check user flows
- Verify UI/UX

### 6. Create Check Report

```markdown
# Check {id}: {Title}

## Meta
- **Check ID:** {id}
- **Run ID:** {run-id}
- **Spec ID:** {spec-id}
- **Status:** completed
- **Result:** pass|fail|partial
- **Agent:** {your-name}
- **Completed:** {ISO-timestamp}

## Summary

**Result:** {pass/fail/partial}

{Brief summary of verification}

## Requirements Verification

### Functional
- [x] Feature 1 - ✓ Working
- [x] Feature 2 - ✓ Working
- [ ] Feature 3 - ✗ Not implemented

### Technical
- [x] Tests passing - ✓
- [x] Builds successfully - ✓
- [x] Type safe - ✓

### Documentation
- [x] README updated - ✓
- [x] Comments added - ✓

## Test Results

```
npm test
✓ All 42 tests passing
Coverage: 87%
```

## Issues Found

{If result is fail or partial, list issues:}

1. **Issue 1**
   - Severity: High|Medium|Low
   - Description: ...
   - Location: file:line
   - Fix needed: ...

## Recommendations

{Suggestions for improvement, even if passed}

## Sign-Off

- [ ] Ready for merge
- [ ] Ready for deployment
- [ ] Needs fixes (see issues)
```

### 7. Save to Memory

```sql
-- Create check result
INSERT INTO check_result (id, run_id, location, status, result, agent, completed_at)
VALUES ('{id}', '{run-id}', '_conduct/checks/{id}.check.md', 'completed', '{result}', '{agent}', '{timestamp}');

-- Update run if failed
-- UPDATE run SET status = 'failed' WHERE id = '{run-id}';
```

Execute:
```bash
conduct save _conduct/operations/create-check-{id}.sql
```

### 8. Update Tracker

```json
// conduct.track.json
{
  "checks": [
    {
      "id": "{id}",
      "run_id": "{run-id}",
      "location": "_conduct/checks/{id}.check.md",
      "result": "{pass/fail/partial}"
    }
  ]
}
```

## Output

Present the check results:

```
✅ Check Complete: _conduct/checks/42.check.md

📊 Result: PASS

✓ All requirements met
✓ Tests passing (42/42)
✓ Build successful
✓ Code quality good

📝 Recommendations:
  • Add edge case tests for error handling
  • Consider extracting shared logic

🎯 Ready for: Merge + Deploy

💾 Memory: Check recorded
```

## Result Types

**PASS:** All requirements met, no blockers
**PARTIAL:** Most requirements met, minor issues
**FAIL:** Critical requirements not met, needs fixes

## Notes

- Be thorough but fair
- Document even minor issues
- Provide actionable feedback
- Consider both spec and best practices
- Don't pass if tests fail
- Update run status if failed
