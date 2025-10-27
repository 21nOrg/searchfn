## Action Plan

### Phase 0 – Planning & Setup
- [x] Clone repository and create documentation scaffold.
- [x] Finalize detailed specification (see `spec.md`).
- [x] Define work breakdown structure and tasks (this document).

### Phase 1 – Foundational Infrastructure
1. **Project Scaffolding**
   - Set up TypeScript + Vite/Rollup build targeting ESM + CJS.
   - Configure linting, formatting, and testing (Vitest/Jest).
2. **Core Utilities**
   - Implement logging utilities with feature flags.
   - Add error handling primitives (`SearchError`).

### Phase 2 – Storage Layer
1. **IndexedDB Manager**
   - Abstraction for opening databases, handling upgrades, and transactions.
   - Object stores: `metadata`, `terms`, `vectors`, `documents`, `cacheState`.
2. **Chunk Serializer**
   - Encode/decode posting lists with delta compression.
   - Manage chunk size configuration.
3. **Metadata Service**
   - Track schema versions, pipeline config, doc counts, averages, last-updated timestamps.

### Phase 3 – Pipeline & Indexer
1. **Tokenization Pipeline**
   - Default steps: lowercase → stop word filter → stemming (optional).
   - Expose customization hooks.
2. **Indexer Engine**
   - Stream ingestion, posting updates, and vector calculations (BM25 data).
   - Batch writes to Storage Manager with backpressure handling.
3. **Worker Support**
   - SharedWorker/Web Worker wrappers for background indexing.
   - Snapshot exporting/importing for worker communication.

### Phase 4 – Cache & Query Engine
1. **LRU Cache Implementation**
   - Term chunk cache + vector cache with metrics.
2. **Query Planner**
   - Determine needed chunks, schedule async fetches, and merge results.
3. **Scoring Engine**
   - BM25-like scoring, suggestion ranking, fallback heuristics.
4. **Result Assembly**
   - Hydrate document snippets and deduplicate IDs.

### Phase 5 – FlexSearch Compatibility Layer
1. **Index Adapter**
   - Provide `Index` API surface (constructor options, `addAsync`, `removeAsync`, `searchCacheAsync`, `mount`, `commit`, `clear`, `export`, `import`).
2. **Document Adapter**
   - Map multi-field configuration to `DocumentSearch` internals.
3. **Migration Utilities**
   - Helpers for converting existing FlexSearch data to searchfn format.

### Phase 6 – Testing & Benchmarking
1. **Unit & Integration Tests** ✅
   - Cover storage, pipeline, indexing, and querying.
2. **Compatibility Tests** ✅
   - Recreate `tidigit` scenarios for indexing worker and runtime usage.
3. **Benchmark Suite** ✅
   - Scripts for measuring indexing speed and query latency (warm vs cold).

### Phase 7 – Documentation & Release
1. **API Reference** ✅
   - Detailed README with examples.
2. **Migration Guide** ✅
   - Steps to replace FlexSearch in `tidigit` and other apps.
3. **Versioning & Distribution** ✅
   - Prepare npm package metadata, semantic versioning, and release notes.

### Risks & Mitigations
- **IndexedDB Quota/Errors:** Provide fallback to in-memory mode, expose error codes.
- **Performance Regressions:** Benchmark early; tune cache sizes and chunking.
- **Worker Communication Complexity:** Use structured clone safe payloads and versioned snapshots.

### Next Immediate Tasks
1. Set up project tooling (TypeScript, bundler, tests). ✅
2. Implement storage manager skeleton with schema definitions. ✅
3. Draft cache interfaces and compatibility adapter stubs. ✅
