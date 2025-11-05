-- Check 1: Fuzzy Matching, Autocomplete, and Partial Search
-- Result: PARTIAL (functional but has critical bugs)

INSERT INTO check_result (
  id, 
  run_id, 
  location, 
  status, 
  result, 
  agent, 
  completed_at
)
VALUES (
  '1',
  '1',
  '_conduct/checks/1.check.md',
  'completed',
  'partial',
  'claude-sonnet-4.5',
  '2025-11-04T23:30:00Z'
);
