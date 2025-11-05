# Specification: Batched Persistence for SearchFn

## Problem Statement

The current `SearchFn.add()` implementation in searchfn v0.1.0 calls `persistPostings()` after **every single document**, causing severe performance degradation during bulk indexing operations:

**Current Implementation (line 149 in search-engine.ts):**
```typescript
async add(input: AddDocumentInput): Promise<void> {
  // ... process document ...
  await this.persistPostings(); // ⚠️ IndexedDB write PER document
  
  if (input.store) {
    await this.storage.putDocument({...}); // ⚠️ Another IndexedDB write
  }
}
```

**Performance Impact:**
- Indexing 10,000 documents = 20,000+ IndexedDB transactions
- Each transaction involves serialization, encoding, and disk I/O
- tidigit worker reports indexing takes excessive time (multiple seconds/minutes for large datasets)

**Root Cause:**
`persistPostings()` (lines 365-403) iterates all dirty postings, serializes them to JSON, encodes them with delta-varint compression, and writes to IndexedDB individually.

## Solution Design

Add **three complementary mechanisms** for batched persistence:

### 1. Manual Flush API (Recommended for Workers)
Add explicit `flush()` method to persist accumulated changes:

```typescript
// Worker pattern
for (const record of records) {
  await searchEngine.add({ id: record.id, fields }, { persist: false });
}
await searchEngine.flush(); // Single bulk persist
```

### 2. Bulk Add API (Convenience Method)
Add `addBulk()` for batch operations:

```typescript
await searchEngine.addBulk(
  records.map(r => ({ id: r.id, fields: extractFields(r) })),
  { batchSize: 1000 } // Optional progress callbacks
);
```

### 3. Auto-Persist Options (Backward Compatible)
Add configuration to control persistence behavior:

```typescript
const engine = new SearchFn({
  name: "demo",
  fields: ["title"],
  persistence: {
    mode: "manual",        // "immediate" (default) | "manual" | "throttled"
    throttleMs: 1000,      // For throttled mode
    autoPersistThreshold: 100 // Auto-flush after N docs in manual mode
  }
});
```

## Detailed Implementation Plan

### Phase 1: Core Flush Mechanism

#### 1.1 Add `flush()` method to SearchFn

Location: `src/search-engine.ts`

```typescript
export class SearchFn {
  // ... existing code ...
  
  /**
   * Explicitly persist all pending changes to IndexedDB.
   * Must be called when using { persist: false } in add().
   * 
   * @returns Promise that resolves when all changes are persisted
   */
  async flush(): Promise<void> {
    await this.ensureOpen();
    
    if (this.dirtyPostings.size === 0 && !this.vocabularyDirty) {
      return; // Nothing to persist
    }
    
    await this.persistPostings();
    
    // Also persist document stats
    await this.persistStats();
    
    // Persist vocabulary if dirty
    if (this.vocabularyDirty) {
      await this.persistVocabulary();
      this.vocabularyDirty = false;
    }
  }
```

#### 1.2 Add persistence option to `add()` method

Update `AddDocumentInput` interface:

```typescript
export interface AddDocumentOptions {
  /** 
   * Whether to persist changes immediately to IndexedDB.
   * Default: true (backward compatible)
   * Set to false for bulk operations, then call flush() manually.
   */
  persist?: boolean;
}

// Update method signature
async add(input: AddDocumentInput, options?: AddDocumentOptions): Promise<void> {
  await this.ensureOpen();

  const ingest = this.indexer.ingest({
    docId: input.id,
    fields: input.fields
  });

  if (ingest.totalLength === 0) {
    return;
  }

  this.statsManager.addDocument(input.id, ingest.totalLength);

  for (const [field, termFrequencies] of ingest.fieldFrequencies.entries()) {
    const metadata = ingest.fieldMetadata.get(field) ?? new Map();
    for (const [term, frequency] of termFrequencies.entries()) {
      const termMetadata = metadata.get(term);
      this.upsertPosting(field, term, input.id, frequency, termMetadata);
      
      const isPrefix = termMetadata?.isPrefix ?? false;
      if (!isPrefix && !this.vocabulary.has(term)) {
        this.vocabulary.add(term);
        this.vocabularyDirty = true;
      }
    }
  }

  // Only persist if requested (default: true)
  const shouldPersist = options?.persist !== false;
  if (shouldPersist) {
    await this.persistPostings();
  }

  if (input.store) {
    if (shouldPersist) {
      await this.storage.putDocument({
        docId: input.id,
        payload: input.store,
        updatedAt: Date.now()
      });
    } else {
      // Queue for batch persist
      this.pendingDocuments.set(this.docIdToKey(input.id), input.store);
    }
  }
}
```

#### 1.3 Add pending documents queue

```typescript
export class SearchFn {
  // ... existing properties ...
  private readonly pendingDocuments = new Map<string, Record<string, unknown>>();
  
  // Update flush() to handle pending documents
  async flush(): Promise<void> {
    await this.ensureOpen();
    
    // Persist postings first
    if (this.dirtyPostings.size > 0) {
      await this.persistPostings();
    }
    
    // Batch persist pending documents
    if (this.pendingDocuments.size > 0) {
      await this.batchPersistDocuments();
    }
    
    // Persist stats
    await this.persistStats();
    
    // Persist vocabulary
    if (this.vocabularyDirty) {
      await this.persistVocabulary();
      this.vocabularyDirty = false;
    }
  }
  
  private async batchPersistDocuments(): Promise<void> {
    // Use single transaction for all documents
    const db = this.storage.assertDb();
    const tx = db.transaction([STORE_NAMES.documents], "readwrite");
    const store = tx.objectStore(STORE_NAMES.documents);
    
    const putPromises: Promise<void>[] = [];
    for (const [docId, payload] of this.pendingDocuments.entries()) {
      putPromises.push(
        new Promise((resolve, reject) => {
          const request = store.put({
            docId,
            payload,
            updatedAt: Date.now()
          });
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      );
    }
    
    await Promise.all(putPromises);
    this.pendingDocuments.clear();
  }
}
```

#### 1.4 Add stats and vocabulary persistence helpers

```typescript
private async persistStats(): Promise<void> {
  const stats = this.statsManager.snapshot();
  const encoded = new TextEncoder().encode(JSON.stringify(stats));
  await this.storage.putCacheState("document-stats", encoded.buffer);
}

private async persistVocabulary(): Promise<void> {
  const vocab = Array.from(this.vocabulary);
  const encoded = new TextEncoder().encode(JSON.stringify(vocab));
  await this.storage.putCacheState("vocabulary", encoded.buffer);
}

private async loadStats(): Promise<void> {
  const buffer = await this.storage.getCacheState("document-stats");
  if (buffer) {
    const json = new TextDecoder().decode(buffer);
    const stats = JSON.parse(json);
    this.statsManager.load(stats);
  }
}

private async loadVocabulary(): Promise<void> {
  const buffer = await this.storage.getCacheState("vocabulary");
  if (buffer) {
    const json = new TextDecoder().decode(buffer);
    const vocab = JSON.parse(json);
    for (const term of vocab) {
      this.vocabulary.add(term);
    }
  }
}
```

### Phase 2: Bulk Add API

#### 2.1 Add `addBulk()` method

```typescript
export interface BulkAddOptions {
  /** Batch size for progress reporting */
  batchSize?: number;
  /** Progress callback */
  onProgress?: (indexed: number, total: number) => void;
}

/**
 * Bulk add documents with automatic batching and single flush.
 * More efficient than calling add() in a loop.
 */
async addBulk(
  documents: AddDocumentInput[],
  options?: BulkAddOptions
): Promise<void> {
  await this.ensureOpen();
  
  const batchSize = options?.batchSize ?? 1000;
  let indexed = 0;
  
  for (const doc of documents) {
    await this.add(doc, { persist: false });
    indexed++;
    
    if (options?.onProgress && indexed % batchSize === 0) {
      options.onProgress(indexed, documents.length);
    }
  }
  
  await this.flush();
  
  if (options?.onProgress) {
    options.onProgress(indexed, documents.length);
  }
}
```

### Phase 3: Backward Compatibility

#### 3.1 Export `SearchEngine` alias

Location: `src/index.ts`

```typescript
export * from "./search-engine";
export * from "./in-memory-search";

// Backward compatibility: SearchEngine is now SearchFn
export { SearchFn as SearchEngine } from "./search-engine";
export type {
  SearchFnOptions as SearchEngineOptions,
  AddDocumentInput as SearchEngineAddInput,
  SearchOptions as SearchEngineSearchOptions,
  SearchResultItem as SearchEngineResultItem
} from "./search-engine";
```

#### 3.2 Add deprecation notice in README

```markdown
### Migrating from v0.0.x

The main class has been renamed from `SearchEngine` to `SearchFn`. A backward-compatible export is provided:

```ts
// Old (still works, but deprecated)
import { SearchEngine } from "searchfn";
const engine = new SearchEngine({...});

// New (recommended)
import { SearchFn } from "searchfn";
const engine = new SearchFn({...});
```
```

## Migration Path for Tidigit

### Current tidigit implementation:

```typescript
// dexie.indexing.worker.ts (lines 243-280)
const searchEngine = new SearchEngine({
  name: indexDbName,
  fields: table.searchIndices,
  pipeline: { enableStemming: true, language: "en" },
  cache: { terms: 2048, vectors: 512 }
});

await searchEngine.clear();

const records = await loadAllRecords(db, table.name);
const batchSize = 1000;

for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, Math.min(i + batchSize, records.length));
  const addPromises: Promise<unknown>[] = [];

  for (const record of batch) {
    const fields = extractSearchFields(record, table.searchIndices);
    if (!record?.id || !fields) continue;
    addPromises.push(Promise.resolve(searchEngine.add({ id: record.id, fields })));
  }

  await Promise.allSettled(addPromises);
  // ... progress reporting ...
}
```

### Optimized implementation (Option 1: Manual Flush):

```typescript
const searchEngine = new SearchEngine({ // Works with backward compat
  name: indexDbName,
  fields: table.searchIndices,
  pipeline: { enableStemming: true, language: "en" },
  cache: { terms: 2048, vectors: 512 }
});

await searchEngine.clear();

const records = await loadAllRecords(db, table.name);
const batchSize = 1000;

for (let i = 0; i < records.length; i += batchSize) {
  const batch = records.slice(i, Math.min(i + batchSize, records.length));

  // Add without persisting
  for (const record of batch) {
    const fields = extractSearchFields(record, table.searchIndices);
    if (!record?.id || !fields) continue;
    await searchEngine.add({ id: record.id, fields }, { persist: false });
  }

  // Progress reporting
  currentProgress.indexedRecords = i + batch.length;
  currentProgress.progress = Math.floor((currentProgress.indexedRecords / currentProgress.totalRecords) * 100);
  broadcastProgress(port);
}

// Single flush at the end
await searchEngine.flush();
```

### Optimized implementation (Option 2: Bulk API):

```typescript
const searchEngine = new SearchEngine({
  name: indexDbName,
  fields: table.searchIndices,
  pipeline: { enableStemming: true, language: "en" },
  cache: { terms: 2048, vectors: 512 }
});

await searchEngine.clear();

const records = await loadAllRecords(db, table.name);
const documents = records
  .map(r => {
    const fields = extractSearchFields(r, table.searchIndices);
    if (!r?.id || !fields) return null;
    return { id: r.id, fields };
  })
  .filter(Boolean);

await searchEngine.addBulk(documents, {
  batchSize: 1000,
  onProgress: (indexed, total) => {
    currentProgress.indexedRecords = indexed;
    currentProgress.progress = Math.floor((indexed / total) * 100);
    broadcastProgress(port);
  }
});
```

## Performance Impact

**Before (current):**
- 10,000 docs × 2 I/O ops = 20,000 IndexedDB transactions
- Estimated time: 30-60 seconds (depends on device)

**After (with batching):**
- Accumulate in memory: ~100ms
- Single flush: ~500-1000ms
- **Total: ~1-2 seconds (15-30x faster)**

## Testing Requirements

1. **Unit tests:**
   - `add()` with `{ persist: false }` doesn't write to IndexedDB
   - `flush()` persists all pending changes
   - Multiple `flush()` calls are idempotent
   - `addBulk()` produces same results as individual `add()` calls

2. **Integration tests:**
   - Large dataset indexing (10k+ documents)
   - Progress callbacks fire correctly
   - Worker snapshot export/import after bulk add
   - Search accuracy after batched indexing

3. **Performance benchmarks:**
   - Compare old vs new implementation
   - Measure IndexedDB transaction count
   - Validate memory usage stays reasonable

## API Surface Changes

**New Methods:**
- `SearchFn.flush(): Promise<void>`
- `SearchFn.addBulk(documents, options?): Promise<void>`

**Modified Methods:**
- `SearchFn.add(input, options?): Promise<void>` (added optional second parameter)

**New Interfaces:**
- `AddDocumentOptions` - `{ persist?: boolean }`
- `BulkAddOptions` - `{ batchSize?: number, onProgress?: (indexed, total) => void }`

**Backward Compatible Exports:**
- `export { SearchFn as SearchEngine }`
- All related type aliases

## Files to Modify

1. `src/search-engine.ts` - Core implementation
2. `src/index.ts` - Add backward compat exports
3. `src/storage/indexeddb-manager.ts` - Potentially optimize batch writes
4. `README.md` - Document new APIs and migration
5. `__tests__/search-engine.test.ts` - Add test coverage
6. `examples/bulk-indexing-worker.ts` - Add example

## Rollout Plan

1. **Phase 1 (Week 1):** Implement flush() and persist option
2. **Phase 2 (Week 2):** Add addBulk() convenience API  
3. **Phase 3 (Week 3):** Add backward compat exports and docs
4. **Phase 4 (Week 4):** Migrate tidigit worker and validate performance

## Success Criteria

- ✅ Bulk indexing 10k documents takes < 5 seconds (vs 30-60 seconds currently)
- ✅ Memory usage stays under 100MB during bulk operations
- ✅ All existing tests pass (backward compatibility maintained)
- ✅ tidigit worker indexing time reduced by 80%+
- ✅ Zero breaking changes to existing API

## Design Decisions

### Why not use a single transaction for all postings?

The current `persistPostings()` implementation writes each term's posting list separately because:
1. Each term can have a different number of postings (varying payload sizes)
2. Delta-varint encoding requires term-specific compression
3. Individual term chunks enable partial loading during search

However, we can optimize by:
- Batching multiple term writes in a single transaction
- Using `Promise.all()` for parallel writes within the transaction
- Deferring all writes until `flush()` is called

### Why separate `pendingDocuments` queue?

Document storage (the `store` field) is independent of search indexing:
- Documents go to the `documents` store
- Postings go to the `terms` store
- Both can be batched separately for maximum efficiency

### Why make `persist: true` the default?

Backward compatibility - existing code should continue to work without changes. Users who want performance can opt into manual flushing.

## Future Enhancements

1. **Auto-throttled persistence**: Automatically flush after N seconds or M documents
2. **Memory pressure detection**: Auto-flush when memory usage exceeds threshold
3. **Streaming indexing**: Support for indexing datasets larger than memory
4. **Progress events**: EventEmitter interface for fine-grained progress tracking
5. **Transaction batching**: Group multiple term writes into fewer transactions
