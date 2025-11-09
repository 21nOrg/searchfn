# conduct-run - Execute a specification

You are an AI agent using Conduct v0.1 to implement a specification.

## Your Task

Implement the specification end-to-end, documenting your progress in a run log.

## Steps

### 1. Load the Spec

```bash
conduct list --specs
# Find the spec you need to implement

# Read the spec
cat _conduct/specs/{id}.v0.spec.md
# OR for multi-file specs
ls _conduct/specs/{id}/
cat _conduct/specs/{id}/spec.md
```

### 2. Check for Designs

Before coding, check if UI designs exist:

```bash
ls _conduct/designs/{spec-id}/
```

If designs exist:
- Review them first
- Extract styles, colors, layout
- Implement exactly as designed
- Reference design files in run log

### 3. Query Memory

Understand context:

```bash
conduct list --features
conduct list --runs
```

Look for:
- Related features to modify
- Past runs for similar work
- Patterns to follow

### 4. Create Run Structure

**Simple run** (< 8 hours, single phase):
```
_conduct/runs/{id}.v0.run.md
```

**Multi-phase run** (> 8 hours, multiple phases):
```
_conduct/runs/{id}/
├── index.md          # Plan + progress (REQUIRED)
├── 1-{phase}.md      # Phase 1 log
├── 2-{phase}.md      # Phase 2 log
└── ...
```

### 5. Create the Run Log

Start your run log:

```markdown
# Run {id}: {Title}

## Meta
- **Run ID:** {id}
- **Spec ID:** {spec-id}
- **Spec Version:** {version}
- **Status:** in-progress
- **Agent:** {your-name}
- **Started:** {ISO-timestamp}

## Plan

### Phases
1. {Phase 1 name} - {estimate}
2. {Phase 2 name} - {estimate}
...

### Approach
{High-level implementation approach}

## Execution Log

### Phase 1: {Name}

**Started:** {timestamp}

**Tasks:**
- [ ] Task 1
- [ ] Task 2
...

**Changes:**
- Created: {files}
- Modified: {files}
- Deleted: {files}

**Completed:** {timestamp}

---

{Continue for each phase}
```

### 6. Implement

As you work:
- Update the run log in real-time
- Check off completed tasks
- Document decisions and changes
- Link to features you modify

### 7. Link to Features

Track which features you touched:

```sql
-- Link run to features
INSERT INTO run_feature (run_id, feature_id, type, description)
VALUES ('{run-id}', {feature-id}, 'change', 'Updated authentication flow');

-- Types: new | change | fix | meta
```

### 8. Save to Memory

```sql
-- Create run
INSERT INTO run (id, spec_id, spec_version, location, status, agent, started_at)
VALUES ('{id}', '{spec-id}', {version}, '_conduct/runs/{id}/', 'in-progress', '{agent}', '{timestamp}');

-- Update when complete
UPDATE run SET status = 'completed', completed_at = '{timestamp}' WHERE id = '{id}';
```

Execute:
```bash
conduct save _conduct/operations/update-run-{id}.sql
```

### 9. Update Spec Status

When run is complete:

```sql
UPDATE spec SET status = 'completed', completed_at = '{timestamp}' WHERE id = '{spec-id}';
```

### 10. Test & Verify

Before marking complete:
- Run tests: `npm test`
- Type check: `npm run lint`
- Build: `npm run build`
- Manual testing

Document test results in run log.

## Output

Present the completion summary:

```
✅ Run Complete: _conduct/runs/42/

📊 Summary:
  • Duration: 4.5 hours
  • Phases: 3/3 completed
  • Files changed: 12
  • Tests: All passing ✓

🔗 Features Modified:
  • auth - Updated login flow
  • user-profile - Added settings page

📝 Next Steps:
  1. Review changes
  2. Run: conduct-check 42
  3. Deploy (if applicable)

💾 Memory: Run logged and linked
```

## Notes

- Always check for designs before coding
- Update run log as you work (not at the end)
- Link to features for traceability
- Test thoroughly before marking complete
- Document blockers and workarounds
- Update spec status when done
