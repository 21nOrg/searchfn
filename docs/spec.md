## Project Overview

The **searchfn** project delivers a browser-first full text search engine that persists its index in IndexedDB while maintaining a hot in-memory cache for low-latency queries. The library is framework-agnostic and must drop in as a replacement for the current FlexSearch usage inside the `tidigit` repository.

### Objectives
- Provide a modular search engine with IndexedDB-backed storage and selective in-memory caching.
- Offer an API surface compatible with the current FlexSearch usage patterns in `tidigit` (`Index`, `Document`, async add/remove, mount/export/import, searchCacheAsync`, etc.).
- Support custom tokenization pipelines, BM25-style scoring, and configurable cache policies.
- Ensure portability across modern browsers and build toolchains (ESM + TypeScript declarations).
- Expose optional workers for background indexing.

### Non-Goals
- Server-side storage implementations (focus is browser IndexedDB).
- Advanced query language parsing beyond phrase/suggestion support required by `tidigit`.

## Requirements

### Functional Requirements
1. **Index Creation & Management**
   - Create per-table indexes with configurable fields.
   - Support async `add`, `addAsync`, `removeAsync`, `clear`, `commit`, and `destroy` semantics.
   - Persist index segments, metadata, and documents to IndexedDB.
   - Import/export index snapshots for worker hand-off.

2. **Query Execution**
   - Provide `search`, `searchAsync`, and `searchCacheAsync` methods with parameters: query string, limit, context suggestions.
   - Support both single-term and phrase queries; handle suggestions for partial matches.
   - Return document IDs consistent with input types (`string | number`).

3. **Caching**
   - Maintain configurable LRU caches for term postings, document vectors, and hydrated documents.
   - Allow warm-up routines for hot terms and provide cache inspection metrics.

4. **Persistence**
   - Automatically sync in-memory changes to IndexedDB with batched transactions.
   - Provide utilities for schema upgrades and cleanup of orphaned databases.

5. **Integration Layer**
   - Offer a compatibility adapter resembling FlexSearch’s `Index`/`Document` constructors to ease migration in `tidigit`.
   - Expose TypeScript types for direct integration.

### Non-Functional Requirements
- **Performance:** Sub-10 ms query latency for cached terms; degrade gracefully to <50 ms for cold lookups on mid-sized datasets (≤100k docs).
- **Scalability:** Support datasets up to ~500k tokens with chunked IndexedDB storage.
- **Reliability:** Recover from interrupted transactions and quota errors with informative diagnostics.
- **Compatibility:** Target modern evergreen browsers, Dexie/SharedWorker environments, and Node.js (for tests/builds).

## Architecture

### High-Level Components
1. **Pipeline Service**
   - Handles tokenization, normalization, stop-word removal, and optional stemming.
   - Configurable via constructor; serialized into metadata for consistent rehydration.

2. **Storage Manager**
   - Wraps IndexedDB interactions with async methods (`open`, `readTermChunk`, `writeChunks`, etc.).
   - Organizes object stores:
     - `metadata`: schema, field definitions, pipeline config, doc counts.
     - `terms`: composite key `[field, term, chunk]` with posting arrays + metrics.
     - `vectors`: doc-field sparse vectors for scoring.
     - `documents`: stored original snippets/fields.
     - `cacheState` (optional): captured hot entries for warm start.

3. **Cache Layer**
   - Configurable LRU caches for term postings and document vectors.
   - Implements warm-up routines and cache statistics (hit/miss, evictions).

4. **Indexer**
   - Streaming ingestion pipeline that tokenizes records, generates posting diffs, and writes batched updates.
   - Supports worker offloading via message-based job queue.

5. **Query Engine**
   - Orchestrates pipeline analysis, asynchronous chunk fetches, scoring (BM25/TF-IDF hybrid), and result assembly.
   - Provides methods to support `search`, `searchCacheAsync`, `suggest` behavior.

### Data Flow
```
Documents → Pipeline → Indexer → Storage Manager (IndexedDB)
                               ↘ Cache Layer ↗
                        Query Engine ← Queries
```

### Storage Layout Details
- **Term chunks**: Posting lists split into configurable batch sizes (default 256 IDs) with metadata `{idf, docFreq, lastAccess, accessCount}`.
- **Vectors**: Stored as sparse `[index, weight]` arrays per document/field to reuse scoring calculations.
- **Metadata**: Tracks total docs, average field lengths, pipeline config, cache settings, versioning.

## API Design

### Core Classes

#### `SearchEngine`
- Constructor accepts configuration ({ name, fields, pipeline, cache, storage }) and initializes metadata.
- Methods:
  - `add(id, text | record)` / `addAsync` (Promise) for ingestion.
  - `remove(id)` / `removeAsync`.
  - `clear()` for wiping in-memory state and IndexedDB stores.
  - `search(query, options)` & `searchAsync`.
  - `searchCacheAsync(query, options)` optimized for cached operations.
  - `export()` / `import(snapshot)` for worker transfers.
  - `mount(persistenceProvider)` to attach existing IndexedDB store (FlexSearch-compatible call).
  - `commit()` to flush pending writes.

#### `DocumentSearch`
- Provides multi-field search akin to FlexSearch’s `Document` API:
  - Accepts document schema ({ idField, fieldsToIndex, fieldsToStore }).
  - Offers `add`, `remove`, `search`, `suggest` methods.

#### Compatibility Layer (`FlexCompat`)
- Exposes `Index` and `Document` constructors with method signatures matching FlexSearch usage in `tidigit` (e.g., `addAsync`, `removeAsync`, `searchCacheAsync`, `mount`, `export`, `import`).
- Internally delegates to `SearchEngine` / `DocumentSearch`.

### Options & Defaults
- `cache.maxTerms`: default 2048 entries.
- `cache.maxVectors`: default 4096 field vectors.
- `storage.dbVersion`: increments on schema changes.
- `pipeline`: default pipeline performing lowercasing + punctuation trim + stop word filter (extensible).

### Error Handling
- Promise rejections with custom `SearchError` type containing `code` and message.
- Graceful fallback to in-memory only mode if IndexedDB unavailable, with warning logs.

## Algorithm Choices

- **Tokenization:** configurable regex-based splitter with optional user-defined function.
- **Scoring:** BM25-inspired formula using cached IDF values and document field vectors; fallback to TF for minimal config.
- **Caching:** LRU implemented via doubly-linked map for O(1) insert/eviction. Hot chunk selection guided by access counters.
- **Compression:** Delta-encode posting lists before storage; optional Snappy/LZ-based compression if available.

## Integration With `tidigit`

- Provide drop-in `Index` replacement with methods used in `DexiePersistence` (addAsync, removeAsync, clear, commit, mount, searchCacheAsync).
- Support worker export/import using JSON serializable snapshots to integrate with `dexie.indexing.worker.ts` workflow.
- Ensure flattened text indexing for `searchIndices` while leaving hooks for multi-field `Document` indices if needed later.
- Maintain compatibility with SharedWorker environment (static `globalThis.indexedDB`).

## Testing Strategy

- **Unit Tests:** Pipeline transformations, cache eviction, storage interactions (mocked IndexedDB).
- **Integration Tests:** End-to-end ingestion/search flows using realistic datasets, persistence round-trips, worker exports.
- **Benchmark Harness:** Script to index 10k/50k documents, measure cold vs warm query latency.
- **Compatibility Tests:** Validate `tidigit` scenarios via fixtures covering `addAsync`, `removeAsync`, `searchCacheAsync`, worker import/export.

## Documentation & Deliverables

- Primary README describing installation, quick start, and API reference.
- Migration guide for replacing FlexSearch in `tidigit` (and other apps).
- Primer (from analysis) adapted for end-user docs.
- Examples demonstrating vanilla JS usage, React hook integration, and worker-based indexing.
