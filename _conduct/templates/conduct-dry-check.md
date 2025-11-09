# conduct-dry-check - Verify plan against spec

You are an AI agent using Conduct v0.1 to verify an execution plan matches the specification.

## Your Task

Review a dry-run plan and ensure it correctly addresses all spec requirements.

## Steps

### 1. Load Spec and Plan

```bash
# Read spec
cat _conduct/specs/{id}.v0.spec.md

# Read plan
cat _conduct/plans/spec-{id}-plan.md
```

### 2. Verify Coverage

Check that the plan addresses:

**Functional Requirements:**
- [ ] All features from spec
- [ ] All user stories covered
- [ ] Edge cases considered
- [ ] Error handling planned

**Technical Requirements:**
- [ ] Architecture matches spec
- [ ] Database schema (if applicable)
- [ ] API contracts (if applicable)
- [ ] Performance considerations

**Quality Requirements:**
- [ ] Testing strategy included
- [ ] Documentation planned
- [ ] Code review process
- [ ] Deployment strategy

### 3. Check Estimates

Verify estimates are reasonable:
- Not too optimistic
- Account for testing time
- Include buffer for unknowns
- Match LOE from spec

### 4. Review Approach

Assess the planned approach:
- Is it the right solution?
- Are there better alternatives?
- Does it follow best practices?
- Any technical debt created?

### 5. Identify Gaps

Find what's missing:
- Missing requirements
- Overlooked edge cases
- Missing tests
- Documentation gaps
- Deployment steps

### 6. Create Verification Report

```markdown
# Dry Check: Spec {id} Plan

## Meta
- **Spec ID:** {id}
- **Plan:** spec-{id}-plan.md
- **Result:** pass|fail|needs-review
- **Agent:** {name}
- **Date:** {timestamp}

## Summary

**Result:** {pass/fail/needs-review}

{Brief assessment}

## Coverage Analysis

### Functional Requirements
- [x] Feature 1 - Covered in Phase 2
- [x] Feature 2 - Covered in Phase 3
- [ ] Feature 3 - **MISSING**

### Technical Requirements
- [x] Database schema - Phase 1
- [x] API endpoints - Phase 2
- [x] Authentication - Phase 2
- [ ] Caching - **NOT ADDRESSED**

### Quality Requirements
- [x] Unit tests - Planned
- [x] Integration tests - Planned
- [ ] Performance tests - **MISSING**

## Estimate Assessment

**Original LOE:** {spec-loe}
**Plan Estimate:** {plan-hours}h

**Assessment:** Reasonable|Too optimistic|Too conservative

**Breakdown:**
- Development: {hours}h
- Testing: {hours}h
- Documentation: {hours}h
- Buffer: {hours}h

## Approach Review

**Strengths:**
- Pro 1
- Pro 2

**Concerns:**
- Concern 1
- Concern 2

**Suggestions:**
- Suggestion 1
- Suggestion 2

## Gaps Identified

1. **Missing Feature:** Feature 3 from spec not in plan
   - Impact: High
   - Fix: Add to Phase 2

2. **Missing Tests:** No performance test plan
   - Impact: Medium
   - Fix: Add performance test phase

3. **Documentation:** API docs not mentioned
   - Impact: Low
   - Fix: Add to Phase 4

## Risks Not Addressed

- Risk A from spec not mitigated
- Dependency on X not mentioned

## Recommendations

1. Add missing feature 3
2. Include performance testing
3. Plan API documentation
4. Add 2h buffer for unknowns

**Updated Estimate:** {new-hours}h

## Decision

- [ ] **Approve** - Plan is good, proceed
- [ ] **Revise** - Address gaps, then proceed
- [ ] **Reject** - Major issues, restart planning
```

### 7. Present Results

```
✅ Dry Check Complete

📊 Result: NEEDS REVIEW

Coverage:
  ✓ 8/10 requirements
  ✗ 2 gaps identified

Estimate:
  Original: 8h
  Plan: 6h
  Recommended: 8h (added buffer)

Issues:
  🔴 Missing Feature 3
  🟡 No performance tests
  🟡 API docs not planned

Recommendation: Revise plan and recheck

📄 Report: _conduct/checks/spec-{id}-dry-check.md
```

### 8. Save Report

Save as: `_conduct/checks/spec-{id}-dry-check.md`

## Result Types

**PASS:** Plan fully addresses spec, estimates reasonable
**NEEDS REVIEW:** Minor gaps, easy to fix
**FAIL:** Major gaps, plan needs rework

## Use Cases

1. **Before execution** - Catch issues early
2. **For complex specs** - Ensure nothing missed
3. **For new team members** - Validate understanding
4. **For estimates** - Verify realistic scope

## Notes

- Be thorough but constructive
- Focus on gaps, not style
- Suggest solutions, not just problems
- Consider feasibility
- Check against spec, not preferences
- Approve simple plans quickly
