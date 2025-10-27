# searchfn

`searchfn` is a browser-first full-text search engine that keeps its index in IndexedDB while caching hot postings in memory. It ships a FlexSearch-compatible adapter so existing applications can migrate without rewriting worker pipelines.

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

await engine.destroy();
```

## FlexSearch Compatibility

```ts
import { FlexSearchIndexAdapter } from "searchfn";

const adapter = new FlexSearchIndexAdapter({
  name: "tidigit-search",
  fields: ["text"],
  cache: { term: 1024 }
});

await adapter.addAsync("a", "Quick brown fox");
const ids = await adapter.searchCacheAsync("quick", { limit: 5 });
```

## Worker Snapshots

```ts
const payload = await adapter.exportWorkerSnapshot();
// transfer over postMessage
await adapter.importWorkerSnapshot(payload);
```

## Migration Utilities

```ts
import { migrateFlexStoreToSearchEngine } from "searchfn";

await migrateFlexStoreToSearchEngine(engine, flexStore, {
  indexFields: ["title", "body"],
  storeFields: ["title", "tags"]
});
```

See [`docs/migration-guide.md`](./docs/migration-guide.md) for a full walkthrough.
