INSERT INTO package (slug, name, paths)
VALUES ('searchfn', 'SearchFn - Full-Text Search Library', '["src"]');

INSERT INTO feature (slug, name, package_id, paths, status)
VALUES
  ('search-engine', 'Search Engine Core', 1, '["src/search-engine", "src/search-engine.ts"]', 'active'),
  ('storage', 'IndexedDB Storage Layer', 1, '["src/storage"]', 'active'),
  ('cache', 'LRU Caching System', 1, '["src/cache"]', 'active'),
  ('indexing', 'Document Indexing', 1, '["src/indexing"]', 'active'),
  ('query', 'Query Execution & Scoring', 1, '["src/query"]', 'active'),
  ('pipeline', 'Text Processing Pipeline', 1, '["src/pipeline"]', 'active'),
  ('compat', 'FlexSearch Compatibility', 1, '["src/compat"]', 'active'),
  ('config', 'Configuration Management', 1, '["src/config"]', 'active'),
  ('utils', 'Utility Functions', 1, '["src/utils"]', 'active');

INSERT INTO feature (slug, name, package_id, parent_id, paths, status)
VALUES
  ('search-engine-snapshots', 'Worker Snapshots', 1, 1, '["src/search-engine/worker-snapshot.ts"]', 'active'),
  ('storage-indexeddb', 'IndexedDB Manager', 1, 2, '["src/storage/indexeddb-manager.ts"]', 'active'),
  ('storage-serializer', 'Chunk Serializer', 1, 2, '["src/storage/chunk-serializer.ts"]', 'active'),
  ('cache-lru', 'LRU Cache Implementation', 1, 3, '["src/cache/lru-cache.ts"]', 'active'),
  ('indexing-indexer', 'Main Indexer', 1, 4, '["src/indexing/indexer.ts"]', 'active'),
  ('indexing-accumulator', 'Document Accumulator', 1, 4, '["src/indexing/document-accumulator.ts"]', 'active'),
  ('query-engine', 'Query Engine', 1, 5, '["src/query/query-engine.ts"]', 'active'),
  ('query-scoring', 'BM25 Scoring', 1, 5, '["src/query/scoring.ts"]', 'active'),
  ('query-stats', 'Document Statistics', 1, 5, '["src/query/document-stats.ts"]', 'active'),
  ('pipeline-tokenization', 'Tokenization Stages', 1, 6, '["src/pipeline/stages.ts"]', 'active'),
  ('pipeline-stopwords', 'Stop Words Filtering', 1, 6, '["src/pipeline/stop-words.ts"]', 'active'),
  ('pipeline-stemmers', 'Word Stemmers', 1, 6, '["src/pipeline/stemmers"]', 'active'),
  ('pipeline-stemmer-english', 'English Stemmer', 1, 22, '["src/pipeline/stemmers/english-stemmer.ts"]', 'active'),
  ('pipeline-stemmer-noop', 'No-op Stemmer', 1, 22, '["src/pipeline/stemmers/noop-stemmer.ts"]', 'active'),
  ('compat-index', 'FlexSearch Index Adapter', 1, 7, '["src/compat/index-adapter.ts"]', 'active'),
  ('compat-document', 'FlexSearch Document Adapter', 1, 7, '["src/compat/document-adapter.ts"]', 'active'),
  ('compat-migration', 'Migration Utilities', 1, 7, '["src/compat/migration.ts"]', 'active'),
  ('utils-env', 'Environment Detection', 1, 9, '["src/utils/env.ts"]', 'active'),
  ('utils-logger', 'Debug Logger', 1, 9, '["src/utils/logger.ts"]', 'active');
