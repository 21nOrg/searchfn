-- Update check 2 to reflect addition of optional enhancements
UPDATE check_result
SET 
  completed_at = '2025-11-05T02:40:00Z',
  notes = 'Added optional enhancements: benchmarks/batched-indexing-benchmark.ts and examples/bulk-indexing-worker.ts'
WHERE id = '2';
