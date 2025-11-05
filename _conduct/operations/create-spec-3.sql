-- Create spec 3: Advanced Bulk Write Optimizations
INSERT INTO spec (
  id,
  location,
  status,
  loe,
  agent,
  source_type,
  source_ref,
  created_at
) VALUES (
  '3',
  '_conduct/specs/3.v0.spec.md',
  'pending',
  'medium',
  'claude-sonnet-4.5',
  'prompt',
  'User request: bulk write performance optimizations',
  '2025-11-05T03:00:00Z'
);

-- Link to related spec (builds on Spec 2)
-- Note: This assumes a spec_dependency table exists
-- If not, this can be tracked in the spec document itself
