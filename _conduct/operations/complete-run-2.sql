-- Save run 2: Batched Persistence for Bulk Indexing
INSERT INTO run (
  id,
  spec_id,
  spec_version,
  location,
  status,
  agent,
  started_at,
  completed_at
)
VALUES (
  '2',
  '2',
  0,
  '_conduct/runs/2/',
  'completed',
  'claude-sonnet-4.5',
  '2025-11-04T15:50:00Z',
  '2025-11-04T17:00:00Z'
);

-- Update spec status to completed
UPDATE spec
SET status = 'completed',
    completed_at = '2025-11-04T17:00:00Z'
WHERE id = '2';

-- Link run to modified features
INSERT INTO run_feature (run_id, feature_id, type, description)
VALUES
  ('2', 'search-engine', 'change', 'Added flush(), addBulk(), and batched persistence'),
  ('2', 'storage-indexeddb', 'change', 'Optimized batch document writes'),
  ('2', 'query-stats', 'change', 'Added stats persistence'),
  ('2', 'indexing-indexer', 'meta', 'Integration point for batching');
