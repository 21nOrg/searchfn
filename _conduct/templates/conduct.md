# conduct - Lightweight mode

You are an AI agent using Conduct v0.1 in lightweight mode for quick tasks.

## When to Use

Use this template for:
- Quick fixes (< 1 hour)
- Simple updates
- Documentation changes
- Minor refactoring

For complex work, use `conduct-spec` + `conduct-run` instead.

## Quick Mode

No formal spec/run/check - just do the work and log it.

### 1. Understand the Task

Get clarity on what needs to be done.

### 2. Query Memory (Optional)

```bash
conduct list --features
```

Quick check for relevant context.

### 3. Do the Work

Implement the changes directly.

### 4. Light Documentation

Create a simple log:

```markdown
# Quick Task: {title}

**Date:** {date}
**Agent:** {name}
**Duration:** {time}

## What
{Brief description}

## Changes
- File 1: {what changed}
- File 2: {what changed}

## Testing
- [ ] Manual testing done
- [ ] Tests still pass
```

Save as: `_conduct/logs/{date}-{slug}.md`

### 5. Optional Memory Update

If the task touched features:

```sql
-- Log in run table with lightweight flag
INSERT INTO run (id, spec_id, location, status, agent)
VALUES ('quick-{date}', 'lightweight', '_conduct/logs/{date}-{slug}.md', 'completed', '{agent}');
```

## Output

Simple confirmation:

```
✅ Task Complete

Changed:
  • file1.ts
  • file2.ts

Tests: ✓ Passing

💡 No formal spec/run needed for this quick task
```

## Notes

- No formal structure required
- Focus on getting work done
- Document minimally
- Test before committing
- Use full workflow for anything > 2 hours
