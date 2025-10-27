# FlexSearch → searchfn Migration Guide

This guide explains how to replace FlexSearch with `searchfn` in IndexedDB-powered applications such as `tidigit`.

## 1. Install

```bash
npm install searchfn
```

## 2. Replace FlexSearch Constructors

- For single-field indexes, instantiate `FlexSearchIndexAdapter`.
- For multi-field document indexes, use `FlexSearchDocumentAdapter` with the existing schema definition.

```ts
import { FlexSearchIndexAdapter } from "searchfn";

const index = new FlexSearchIndexAdapter({
  name: "notes",
  fields: ["text"],
  cache: { term: 2048 }
});

await index.addAsync("doc-1", "Notebook entry");
```

## 3. Background Workers

`searchfn` exposes worker-friendly snapshot helpers:

```ts
const payload = await index.exportWorkerSnapshot();
port.postMessage(payload);

await index.importWorkerSnapshot(payloadFromWorker);
```

## 4. Migrating Existing IndexedDB Data

Use the `migrateFlexStoreToSearchEngine` helper to re-ingest stored FlexSearch documents.

```ts
import { migrateFlexStoreToSearchEngine } from "searchfn";

await migrateFlexStoreToSearchEngine(engine, legacyStore, {
  indexFields: ["title", "body"],
  storeFields: ["tags"]
});
```

## 5. Testing

- Run `npm run test` to execute unit and compatibility tests.
- Use `npm run benchmark` to observe indexing/query timings.

## 6. Deployment Checklist

- Ensure background workers load `searchfn` bundles and no longer reference FlexSearch.
- Clear legacy FlexSearch IndexedDB databases after migration.
- Monitor cache metrics exposed via `getStatistics()` during rollout.
