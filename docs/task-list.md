## Task List

### Planning
- [x] Clone repository and create documentation directory.
- [ ] Review and refine specification with stakeholders.

### Tooling & Setup
- [ ] Initialize Node/TypeScript project scaffolding.
- [ ] Configure build (Rollup/Vite) for ESM + CJS.
- [ ] Set up linting (ESLint + Prettier) and testing framework (Vitest/Jest).

### Core Implementation
- [ ] Implement `IndexedDbManager` with schema and transaction helpers.
- [ ] Build serialization utilities for posting chunks and vectors.
- [ ] Develop tokenization pipeline with customizable stages.
- [ ] Create `Indexer` for batch ingestion and worker-friendly exports.
- [ ] Build `CacheLayer` with LRU mechanics and metrics.
- [ ] Implement `QueryEngine` with BM25 scoring and suggestion support.

### Compatibility Layer
- [ ] Develop `IndexAdapter` providing FlexSearch-like API (`addAsync`, `removeAsync`, `searchCacheAsync`, `mount`, `commit`, `clear`, `export`, `import`).
- [ ] Implement `DocumentAdapter` for multi-field search scenarios.
- [ ] Provide migration utilities for existing FlexSearch indexes.

### Testing & Quality
- [ ] Write unit tests for each module (storage, pipeline, cache, query).
- [ ] Create integration tests replicating `tidigit` workflows (indexing worker + runtime queries).
- [ ] Build benchmark scripts for warm/cold queries and bulk indexing.

### Documentation & Release
- [ ] Author README with quick start and API reference.
- [ ] Produce migration guide from FlexSearch to searchfn.
- [ ] Document worker usage and IndexedDB schema.
- [ ] Prepare npm package metadata and versioning strategy.
