# searchfn

`searchfn` is a browser-first full-text search engine that keeps its index in IndexedDB while caching hot postings in memory. It ships a FlexSearch-compatible adapter so existing applications can migrate without rewriting worker pipelines.

## Features

- 🗄️ **Persistent Storage** - IndexedDB-backed index with automatic persistence
- ⚡ **In-Memory Cache** - LRU caching for hot postings and vectors
- 🔄 **Full CRUD Support** - Add, update, remove, and retrieve documents
- 🔍 **BM25 Scoring** - Relevance-based ranking with configurable pipeline
- 🧵 **Worker-Ready** - Snapshot export/import for cross-thread usage
- 🔌 **FlexSearch Compatible** - Drop-in replacement for existing FlexSearch code

## Installation

```bash
npm install searchfn
```

## Quick Start

```ts
import { SearchEngine } from "searchfn";

const engine = new SearchEngine({
  name: "demo",
  fields: ["title", "body"]
});

await engine.add({
  id: "doc-1",
  fields: {
    title: "Hybrid search",
    body: "IndexedDB persistence with in-memory caching"
  },
  store: { url: "/docs/hybrid-search" }
});

const hits = await engine.searchDetailed("hybrid", { includeStored: true });
console.log(hits[0]);
// { docId: "doc-1", score: 1.23, document: { url: "/docs/hybrid-search" } }

await engine.destroy();
```

## Core API

### SearchEngine

#### Constructor

```ts
const engine = new SearchEngine({
  name: "my-index",          // Index name (required)
  fields: ["title", "body"], // Searchable fields (required)
  pipeline: {                 // Optional tokenization config
    lowercase: true,
    stopWords: ["the", "a"]
  },
  cache: {                    // Optional cache sizes
    terms: 2048,              // LRU cache for term postings (default: 2048)
    vectors: 512              // LRU cache for document vectors (default: 512)
  },
  storage: {                  // Optional IndexedDB config
    dbName: "custom-db",      // Database name (default: searchfn-{name})
    version: 1,               // Schema version (default: 1)
    chunkSize: 256            // Postings chunk size (default: 256)
  }
});
```

#### Adding Documents

```ts
await engine.add({
  id: "doc-1",                // string | number (required)
  fields: {                   // Indexed fields (required)
    title: "Getting Started",
    body: "Full-text search guide"
  },
  store: {                    // Optional metadata (not indexed, but retrievable)
    url: "/guide",
    tags: ["tutorial", "docs"]
  }
});
```

#### Searching

**Basic search** (returns document IDs):
```ts
const ids = await engine.search("getting started", {
  limit: 10,                  // Max results (optional)
  fields: ["title"]           // Limit search to specific fields (optional)
});
// ["doc-1", "doc-5", ...]
```

**Detailed search** (returns scores and stored data):
```ts
const results = await engine.searchDetailed("getting started", {
  limit: 10,
  includeStored: true         // Include stored metadata
});
// [
//   { docId: "doc-1", score: 1.23, document: { url: "/guide", tags: [...] } },
//   ...
// ]
```

#### Removing Documents

```ts
await engine.remove("doc-1");
```

#### Updating Documents

Update by removing and re-adding:
```ts
await engine.remove("doc-1");
await engine.add({
  id: "doc-1",
  fields: { title: "Updated Title", body: "New content" },
  store: { url: "/new-url" }
});
```

#### Retrieving Stored Data

```ts
const doc = await engine.getDocument("doc-1");
// { url: "/new-url" }
```

#### Snapshots

Export and import index state (useful for persistence or worker transfer):
```ts
const snapshot = await engine.exportSnapshot();
await engine.importSnapshot(snapshot);
```

#### Worker Snapshots

JSON-serializable format for `postMessage`:
```ts
const payload = await engine.exportWorkerSnapshot();
worker.postMessage(payload);

// In worker:
await engine.importWorkerSnapshot(payload);
```

#### Cleanup

```ts
await engine.destroy(); // Deletes IndexedDB database
```

## FlexSearch Compatibility

### Index Adapter

Drop-in replacement for FlexSearch `Index`:

```ts
import { FlexSearchIndexAdapter } from "searchfn";

const index = new FlexSearchIndexAdapter({
  name: "notes",
  fields: ["text"],
  cache: { term: 1024 }
});

// FlexSearch-compatible methods
await index.addAsync("doc-1", "Quick brown fox");
await index.addDocument({ id: "doc-2", fields: { text: "Lazy dog" } });

const ids = await index.searchAsync("quick");
const cached = await index.searchCacheAsync("fox", { limit: 5 });

await index.removeAsync("doc-1");
await index.clear();

// Worker snapshots
const snapshot = await index.exportWorkerSnapshot();
await index.importWorkerSnapshot(snapshot);
```

### Document Adapter

Multi-field search with schema:

```ts
import { FlexSearchDocumentAdapter } from "searchfn";

const index = new FlexSearchDocumentAdapter({
  name: "articles",
  fields: ["title", "body"],
  document: {
    id: "id",
    index: ["title", "body"],    // Fields to index
    store: ["title", "url"]       // Fields to store (not indexed)
  }
});

await index.add({
  id: "article-1",
  fields: { title: "Hello", body: "World" },
  store: { url: "/hello" }
});

const results = await index.search("hello");
// [{ result: ["article-1"], documents: [{ id: "article-1", score: 1.0, ... }] }]

await index.remove("article-1");
```

## Migration Utilities

Migrate existing FlexSearch data from IndexedDB:

```ts
import { migrateFlexStoreToSearchEngine, SearchEngine } from "searchfn";

const engine = new SearchEngine({
  name: "migrated",
  fields: ["title", "body"]
});

await migrateFlexStoreToSearchEngine(engine, legacyFlexStore, {
  indexFields: ["title", "body"],
  storeFields: ["tags", "url"]
});
```

See [`docs/migration-guide.md`](./docs/migration-guide.md) for a full walkthrough.

## Examples

### Basic CRUD Operations

```ts
import { SearchEngine } from "searchfn";

const engine = new SearchEngine({
  name: "notes",
  fields: ["content"]
});

// Add
await engine.add({
  id: "note-1",
  fields: { content: "Buy groceries" },
  store: { createdAt: Date.now() }
});

// Search
const results = await engine.search("groceries");

// Update
await engine.remove("note-1");
await engine.add({
  id: "note-1",
  fields: { content: "Buy milk and bread" },
  store: { createdAt: Date.now(), updatedAt: Date.now() }
});

// Retrieve
const note = await engine.getDocument("note-1");
console.log(note.updatedAt);

// Delete
await engine.remove("note-1");
```

### Multi-Field Search

```ts
const engine = new SearchEngine({
  name: "products",
  fields: ["name", "description", "category"]
});

await engine.add({
  id: "prod-1",
  fields: {
    name: "Wireless Mouse",
    description: "Ergonomic design with USB receiver",
    category: "Electronics"
  },
  store: { price: 29.99, sku: "MOUSE-001" }
});

// Search across all fields
const all = await engine.search("wireless");

// Search specific fields only
const nameOnly = await engine.search("mouse", {
  fields: ["name"]
});
```

### Custom Pipeline

```ts
const engine = new SearchEngine({
  name: "custom",
  fields: ["text"],
  pipeline: {
    lowercase: true,
    stopWords: ["the", "a", "an", "and", "or", "but"],
    split: /[\s\-_]+/  // Custom tokenization regex
  }
});
```

## Architecture

**searchfn** persists its inverted index in IndexedDB while maintaining hot data in LRU caches for low-latency queries.

### Storage Layout

- **metadata**: Schema, field definitions, pipeline config
- **terms**: Posting lists keyed by `[field, term, chunk]` with doc frequencies
- **vectors**: Sparse document-field vectors for BM25 scoring
- **documents**: Stored metadata (not indexed, retrievable via `getDocument`)
- **cacheState**: Captured cache entries for warm start

### Data Flow

```
Documents → Pipeline → Indexer → IndexedDB
                              ↘ LRU Cache ↗
                        Query Engine ← Search queries
```

See [`docs/spec.md`](./docs/spec.md) for detailed architecture.

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run specific test file
npx vitest run __tests__/search-engine.test.ts
```

## Building

```bash
# Build for production
npm run build

# Watch mode
npm run build:watch

# Lint and typecheck
npm run lint
npm run typecheck
```

## Benchmarks

```bash
npm run benchmark
```

## Documentation

- [Architecture & Design](./docs/spec.md)
- [Migration Guide](./docs/migration-guide.md)
- [Development Tasks](./docs/task-list.md)

## License

MIT
