-- Complete Run 3: Advanced Bulk Write Optimizations
INSERT INTO run (
  id,
  spec_id,
  spec_version,
  location,
  status,
  agent,
  started_at,
  completed_at
) VALUES (
  '3',
  '3',
  0,
  '_conduct/runs/3/',
  'completed',
  'claude-sonnet-4.5',
  '2025-11-05T03:15:00Z',
  '2025-11-05T03:45:00Z'
);

-- Update Spec 3 status to completed
UPDATE spec 
SET status = 'completed', completed_at = '2025-11-05T03:45:00Z'
WHERE id = '3';

-- Link run to modified features
INSERT INTO run_feature (run_id, feature_id, type, description)
VALUES 
  ('3', (SELECT id FROM feature WHERE name = 'search-engine' LIMIT 1), 'change', 'Optimized flush() and persistPostings()'),
  ('3', (SELECT id FROM feature WHERE name = 'storage-indexeddb' LIMIT 1), 'change', 'Added putTermChunksBatch() method');
