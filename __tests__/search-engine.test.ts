import { beforeAll, describe, expect, it } from "vitest";
import { SearchEngine } from "../src/search-engine";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";

beforeAll(() => {
  const globalObject = globalThis as unknown as { indexedDB: IDBFactory; IDBKeyRange?: typeof IDBKeyRange };
  globalObject.indexedDB = indexedDB;
  globalObject.IDBKeyRange = IDBKeyRange as unknown as typeof globalObject.IDBKeyRange;
});

describe("SearchEngine", () => {
  it("indexes and retrieves documents", async () => {
    const engine = new SearchEngine({
      name: `test-${Math.random().toString(36).slice(2)}`,
      fields: ["title", "body"]
    });

    await engine.add({
      id: "doc-1",
      fields: {
        title: "Quick brown fox",
        body: "Jumps over the lazy dog"
      }
    });

    await engine.add({
      id: "doc-2",
      fields: {
        title: "Slow turtle",
        body: "Crawls under the fence"
      }
    });

    const results = await engine.search("quick fox", { limit: 5 });
    expect(results[0]).toBe("doc-1");
    await engine.destroy();
  });

  it("supports document removal", async () => {
    const engine = new SearchEngine({
      name: `remove-${Math.random().toString(36).slice(2)}`,
      fields: ["body"]
    });

    await engine.add({
      id: "keep",
      fields: { body: "alpha beta gamma" }
    });

    await engine.add({
      id: "remove",
      fields: { body: "beta gamma delta" }
    });

    await engine.remove("remove");

    const results = await engine.search("delta");
    expect(results).toEqual([]);

    await engine.destroy();
  });

  it("hydrates stored documents when requested", async () => {
    const engine = new SearchEngine({
      name: `hydrate-${Math.random().toString(36).slice(2)}`,
      fields: ["body"]
    });

    await engine.add({
      id: "doc-1",
      fields: { body: "delta epsilon zeta" },
      store: { body: "delta epsilon zeta" }
    });

    const results = await engine.searchDetailed("delta", { includeStored: true });
    expect(results[0]).toMatchObject({
      docId: "doc-1",
      document: { body: "delta epsilon zeta" }
    });

    await engine.destroy();
  });

  it("exports and imports snapshots", async () => {
    const engine = new SearchEngine({
      name: `snapshot-${Math.random().toString(36).slice(2)}`,
      fields: ["title"]
    });

    await engine.add({
      id: "doc-1",
      fields: { title: "Snapshot testing" }
    });

    const snapshot = await engine.exportSnapshot();
    await engine.destroy();

    const restored = new SearchEngine({
      name: `snapshot-restored-${Math.random().toString(36).slice(2)}`,
      fields: ["title"]
    });

    await restored.importSnapshot(snapshot);
    const results = await restored.search("snapshot");
    expect(results[0]).toBe("doc-1");

    await restored.destroy();
  });

  it("exports and imports worker snapshots", async () => {
    const engine = new SearchEngine({
      name: `worker-${Math.random().toString(36).slice(2)}`,
      fields: ["title"]
    });

    await engine.add({
      id: "doc-1",
      fields: { title: "Worker snapshot" }
    });

    const payload = await engine.exportWorkerSnapshot();
    await engine.destroy();

    const restored = new SearchEngine({
      name: `worker-restored-${Math.random().toString(36).slice(2)}`,
      fields: ["title"]
    });

    await restored.importWorkerSnapshot(payload);
    const results = await restored.search("worker");
    expect(results).toContain("doc-1");

    await restored.destroy();
  });
});
