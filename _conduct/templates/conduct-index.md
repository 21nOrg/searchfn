# conduct-index - Discover features from codebase

You are an AI agent using Conduct v0.1 to discover and index features in the codebase.

## Your Task

Analyze the codebase and populate the memory database with discovered features.

## Steps

### 1. Identify Packages

For monorepos:

```bash
# Find package structure
find . -name "package.json" -not -path "*/node_modules/*"

# OR check workspace configuration
cat package.json | grep workspaces
```

Create package entries:

```sql
INSERT INTO package (slug, name, paths)
VALUES
  ('frontend', 'Frontend Application', '["src/app", "src/components"]'),
  ('backend', 'Backend API', '["api", "services"]'),
  ('shared', 'Shared Libraries', '["packages/shared"]');
```

### 2. Discover Features

Use multiple strategies:

**Strategy 1: Directory Structure**
```bash
# Top-level features
ls -d src/*/

# Look for common patterns:
# - src/auth/
# - src/user/
# - src/payment/
```

**Strategy 2: Code Exports**
```bash
# Find main entry points
find src -name "index.ts" -o -name "index.js"

# Analyze exports
grep -r "export" src/ | head -50
```

**Strategy 3: Documentation**
```bash
# Check README
cat README.md

# Check docs
ls docs/
```

### 3. Create Feature Hierarchy

Build parent-child relationships:

```sql
INSERT INTO feature (slug, name, package_id, parent_id, paths, status)
VALUES ('auth', 'Authentication', 1, NULL, '["src/auth"]', 'active');

INSERT INTO feature (slug, name, package_id, parent_id, paths, status)
VALUES
  ('auth-login', 'Login Flow', 1, 1, '["src/auth/login"]', 'active'),
  ('auth-signup', 'Signup Flow', 1, 1, '["src/auth/signup"]', 'active'),
  ('auth-oauth', 'OAuth Integration', 1, 1, '["src/auth/oauth"]', 'active');
```

### 4. Determine Status

**Active:** Currently in use
**Deprecated:** Old but still present
**Removed:** No longer in codebase

Check git history for removed features:

```bash
git log --all --full-history --diff-filter=D -- "*feature-name*"
```

### 5. Generate SQL File

**IMPORTANT SQL Rules:**
1. Every SQL statement MUST end with a semicolon (`;`)
2. DO NOT include SQL comments (`--`) - they are stripped during processing
3. DO NOT include block comments (`/* */`) - they will cause validation errors

```sql
INSERT INTO package (slug, name, paths)
VALUES ('api', 'API', '["src/api"]');

INSERT INTO feature (slug, name, package_id, paths, status)
VALUES ('api-auth', 'Authentication', 1, '["src/auth"]', 'active');
```

### 6. Execute

```bash
conduct save _conduct/operations/index-features.sql
```

### 7. Verify

```bash
conduct list --features
conduct list --packages
```

## Discovery Patterns

### Web Applications

Common features:
- Authentication (auth)
- User Management (users)
- Dashboard (dashboard)
- Settings (settings)
- Admin Panel (admin)

### APIs

Common features:
- Endpoints (/api/v1/users, etc.)
- Middleware (auth, logging, etc.)
- Services (database, cache, etc.)
- Models/Schemas

### Libraries

Common features:
- Core functionality
- Utilities
- Types/Interfaces
- Plugins/Extensions

## Example SQL

```sql
INSERT INTO package (slug, name, paths)
VALUES ('myapp', 'My Application', '["src"]');

INSERT INTO feature (slug, name, package_id, paths, status)
VALUES
  ('auth', 'Authentication', 1, '["src/auth"]', 'active'),
  ('users', 'User Management', 1, '["src/users"]', 'active'),
  ('posts', 'Posts System', 1, '["src/posts"]', 'active'),
  ('comments', 'Comments', 1, '["src/comments"]', 'active');
```

## Output

```
✅ Indexing Complete

📦 Packages: 1
  • myapp

🎯 Features: 12
  • auth (3 sub-features)
  • users (2 sub-features)
  • posts
  • comments
  • settings
  • admin

💾 Memory: All features indexed
```

## Notes

- Start broad, then refine
- Parent features for organization
- Flat structure is fine for simple projects
- Update as codebase evolves
- Run periodically to catch new features
