# conduct-spec - Transform intent into specification

You are an AI agent using Conduct v0.1 to transform user intent into a structured specification.

## Your Task

Transform the user's request into a complete, actionable spec that follows the Conduct specification format.

## Steps

### 1. Understand the Intent

Read and clarify the user's request:
- What problem are they trying to solve?
- What's the scope (simple/medium/complex/epic)?
- Are there any constraints or requirements?
- Is there an external reference (GitHub issue, Linear ticket, etc.)?

### 2. Query Memory

Check if related work exists:

```bash
conduct list --specs
conduct list --features
```

Look for:
- Similar past specs
- Related features that might be affected
- Existing patterns to follow

### 3. Determine Structure

Choose spec format based on complexity:

**Single-file spec** (< 500 lines, simple/medium):
```
_conduct/specs/{id}.v0.spec.md
```

**Multi-file spec** (> 500 lines, complex/epic):
```
_conduct/specs/{id}/
├── spec.md           # Overview (REQUIRED)
├── architecture.md   # System design
├── database.md       # Schema details
├── api.md            # API contracts
└── ...
```

### 4. Write the Spec

Create the spec file(s) with this structure:

```markdown
# Spec {id}: {Title}

## Meta
- **Spec ID:** {id}
- **Version:** 0
- **Status:** pending
- **LOE:** simple|medium|complex|epic
- **Agent:** {your-name}
- **Created:** {ISO-timestamp}
- **Source:** prompt|file|github|linear|url
- **Source Ref:** {url-if-applicable}

## What
{Clear description of what needs to be built}

## Why
{Problem being solved, business value}

## How
{High-level approach, key decisions}

## Breakdown
{Detailed breakdown of work, acceptance criteria}

## Success Criteria
{How we know it's done}

## Dependencies
{External dependencies, blockers}
```

### 5. Save to Memory

Create SQL to save the spec:

```sql
-- _conduct/operations/create-spec-{id}.sql
INSERT INTO spec (id, location, status, loe, agent, source_type, source_ref)
VALUES ('{id}', '_conduct/specs/{id}.v0.spec.md', 'pending', '{loe}', '{agent}', '{source}', '{ref}');
```

Execute:
```bash
conduct save _conduct/operations/create-spec-{id}.sql
```

### 6. Link to Issues (Optional)

If there's a GitHub/Linear issue:

```sql
INSERT INTO issue_connection (entity_type, entity_id, tracker_type, issue_id, url, auto_sync)
VALUES ('spec', '{spec-id}', 'github', '{issue-number}', '{url}', 1);
```

### 7. Update Tracker

Update the local tracker:

```json
// conduct.track.json
{
  "specs": [
    {
      "id": "{id}",
      "location": "_conduct/specs/{id}.v0.spec.md",
      "status": "pending",
      "version": 0
    }
  ]
}
```

## Output

Present the spec to the user and confirm:

1. **Spec location**: Where the spec was saved
2. **LOE estimate**: How much work this represents
3. **Next steps**: How to proceed with implementation
4. **Memory status**: Confirmation that spec is saved

## Example

```
✅ Spec Created: _conduct/specs/42.v0.spec.md

📊 Estimate: Complex (20-40 hours)

🔗 Links:
  • GitHub Issue: #123
  • Features: auth, user-profile

📝 Next Steps:
  1. Review the spec
  2. Run: conduct-run 42
  3. Verify: conduct-check 42

💾 Memory: Saved to database
```

## Notes

- Always query memory first to understand context
- For external issues, fetch the content first
- Use LOE appropriately (don't over/under-estimate)
- Link to relevant features when known
- Keep specs actionable and clear
