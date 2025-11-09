# conduct-reconcile - Sync memory with reality

You are an AI agent using Conduct v0.1 to reconcile the memory database with actual codebase changes.

## Your Task

Detect and update features that have been moved, renamed, deprecated, or removed in the codebase.

## Steps

### 1. Run Reconciliation

```bash
conduct reconcile --dry-run
```

This will show detected changes without applying them.

### 2. Review Changes

The system will detect:

**Moved Features:**
- All paths missing
- New location found via git history
- Confidence: 80%

**Renamed Features:**
- Slug changed in codebase
- Similar files found
- Confidence: 70%

**Removed Features:**
- All paths gone
- No git history of movement
- Confidence: 90%

**Deprecated Features:**
- No modifications in > 365 days
- Still present but unused
- Confidence: 60%

### 3. Verify Findings

For each detected change:

- Check the actual files
- Verify git history: `git log --follow -- path/to/file`
- Confirm the feature's current state

### 4. Apply Changes

**Interactive mode:**
```bash
conduct reconcile
# Will prompt for each change
```

**Auto mode:**
```bash
conduct reconcile --auto
# Applies all changes automatically
```

### 5. Manual Updates

For moves/renames, update paths manually:

```sql
-- Update feature paths
UPDATE feature
SET paths = '["new/path"]', updated_at = CURRENT_TIMESTAMP
WHERE slug = 'feature-slug';

-- Update feature status
UPDATE feature
SET status = 'deprecated', updated_at = CURRENT_TIMESTAMP
WHERE slug = 'old-feature';
```

### 6. Document

Create a reconciliation log:

```markdown
# Reconciliation: {date}

## Summary
- Moved: 2
- Deprecated: 5
- Removed: 1

## Changes

### Moved
- **auth-login**: src/auth/login → src/features/auth/login
- **user-profile**: src/profile → src/user/profile

### Deprecated
- **old-dashboard** (no changes in 400 days)
- **legacy-api** (superseded by v2)

### Removed
- **temp-feature** (deleted in commit abc123)

## Actions Taken
- Updated 2 feature paths
- Marked 5 as deprecated
- Marked 1 as removed
```

Save as: `_conduct/logs/reconcile-{date}.md`

## When to Reconcile

Run reconciliation:
- After major refactoring
- Before starting new specs
- After merging large PRs
- Periodically (monthly)

## Output

```
🔍 Reconciliation Results

Detected:
  📦 2 moved
  ✏️ 0 renamed
  ⚠️ 5 deprecated
  🗑️ 1 removed

✅ Applied 8 changes

💾 Memory updated
📄 Log: _conduct/logs/reconcile-2025-11-03.md
```

## Notes

- Confidence scores guide decisions
- Low confidence? Verify manually
- Git history is authoritative
- Document all changes
- Update feature paths, don't delete
- Keep removed features for history
