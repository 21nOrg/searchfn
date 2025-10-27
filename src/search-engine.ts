import { encodePostings } from "./storage";
import { IndexedDbManager } from "./storage";
import type { StorageInitOptions, DocId } from "./types";
import {
  LruCache,
  type CacheOptions,
  type TermCacheValue,
  type VectorCacheValue,
  type TermPosting
} from "./cache";
import { PipelineEngine, type PipelineOptions } from "./pipeline";
import { Indexer } from "./indexing/indexer";
import { QueryEngine, type QueryResult } from "./query/query-engine";
import type { QueryToken } from "./query";
import { DocumentStatsManager } from "./query/document-stats";
import type { SearchEngineSnapshot } from "./search-engine/types";
import {
  toWorkerSnapshotPayload,
  fromWorkerSnapshotPayload,
  type WorkerSnapshotPayload
} from "./search-engine/worker-snapshot";

export interface SearchEngineCacheOptions {
  terms?: number;
  vectors?: number;
}

export interface SearchEngineOptions {
  name: string;
  fields: string[];
  pipeline?: PipelineOptions;
  storage?: Partial<StorageInitOptions>;
  cache?: SearchEngineCacheOptions;
}

export interface AddDocumentInput {
  id: DocId;
  fields: Record<string, string>;
  store?: Record<string, unknown>;
}

export interface SearchOptions {
  fields?: string[];
  limit?: number;
}

export interface SearchDetailedOptions extends SearchOptions {
  includeStored?: boolean;
}

export interface SearchResultItem {
  docId: DocId;
  score: number;
  document?: Record<string, unknown>;
}

export type { SearchEngineSnapshot } from "./search-engine/types";
export type { WorkerSnapshotPayload } from "./search-engine/worker-snapshot";

const DEFAULT_TERM_CACHE: CacheOptions = { maxEntries: 2048 };
const DEFAULT_VECTOR_CACHE: CacheOptions = { maxEntries: 512 };

export class SearchEngine {
  private readonly name: string;
  private readonly fields: string[];
  private readonly storage: IndexedDbManager;
  private readonly termCache: LruCache<TermCacheValue>;
  private readonly vectorCache: LruCache<VectorCacheValue>;
  private readonly statsManager = new DocumentStatsManager();
  private readonly pipeline: PipelineEngine;
  private readonly indexer: Indexer;
  private readonly queryEngine: QueryEngine;
  private readonly postings = new Map<string, Map<string, number>>();
  private readonly dirtyPostings = new Set<string>();
  private openPromise: Promise<void> | null = null;

  constructor(options: SearchEngineOptions) {
    this.name = options.name;
    this.fields = options.fields;

    const storageOptions: StorageInitOptions = {
      dbName: options.storage?.dbName ?? `searchfn-${options.name}`,
      version: options.storage?.version ?? 1,
      chunkSize: options.storage?.chunkSize ?? 256
    };
    this.storage = new IndexedDbManager(storageOptions);

    const termCacheOptions = options.cache?.terms
      ? { maxEntries: options.cache.terms }
      : DEFAULT_TERM_CACHE;
    const vectorCacheOptions = options.cache?.vectors
      ? { maxEntries: options.cache.vectors }
      : DEFAULT_VECTOR_CACHE;
    this.termCache = new LruCache<TermCacheValue>(termCacheOptions);
    this.vectorCache = new LruCache<VectorCacheValue>(vectorCacheOptions);

    this.pipeline = new PipelineEngine(options.pipeline);
    this.indexer = new Indexer(this.pipeline);
    this.queryEngine = new QueryEngine({
      storage: this.storage,
      termCache: this.termCache,
      vectorCache: this.vectorCache,
      stats: this.statsManager
    });
  }

  async add(input: AddDocumentInput): Promise<void> {
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
      for (const [term, frequency] of termFrequencies.entries()) {
        this.upsertPosting(field, term, input.id, frequency);
      }
    }

    await this.persistPostings();

    if (input.store) {
      await this.storage.putDocument({
        docId: input.id,
        payload: input.store,
        updatedAt: Date.now()
      });
    }
  }

  async search(query: string, options?: SearchOptions): Promise<DocId[]> {
    const result = await this.executeSearch(query, options);
    if (!result) return [];
    return result.documents.map((doc) => doc.docId);
  }

  async searchDetailed(query: string, options?: SearchDetailedOptions): Promise<SearchResultItem[]> {
    const result = await this.executeSearch(query, options);
    if (!result) return [];

    const baseItems: SearchResultItem[] = result.documents.map((doc) => ({
      docId: doc.docId,
      score: doc.score
    }));

    if (!options?.includeStored) {
      return baseItems;
    }

    const records = await Promise.all(
      baseItems.map(async (item) => {
        const record = await this.storage.getDocument(item.docId);
        return record?.payload;
      })
    );

    return baseItems.map((item, index) => ({
      ...item,
      document: records[index]
    }));
  }

  async remove(docId: DocId): Promise<void> {
    await this.ensureOpen();
    const docKey = this.docIdToKey(docId);
    let mutated = false;

    for (const [key, docMap] of this.postings.entries()) {
      if (docMap.delete(docKey)) {
        this.dirtyPostings.add(key);
        mutated = true;
      }
      if (docMap.size === 0) {
        this.postings.delete(key);
      }
    }

    if (mutated) {
      await this.persistPostings();
      this.termCache.clear();
    }

    this.statsManager.removeDocument(docId);
    await this.storage.deleteDocument(docId);
  }

  async getDocument(docId: DocId): Promise<Record<string, unknown> | undefined> {
    await this.ensureOpen();
    const record = await this.storage.getDocument(docId);
    return record?.payload;
  }

  async exportSnapshot(): Promise<SearchEngineSnapshot> {
    await this.ensureOpen();
    return {
      postings: Array.from(this.postings.entries()).map(([key, docMap]) => {
        const [field, term] = key.split("::");
        const documents: TermPosting[] = Array.from(docMap.entries()).map(([docId, termFrequency]) => ({
          docId,
          termFrequency
        }));
        return { field, term, documents };
      }),
      stats: this.statsManager.snapshot()
    };
  }

  async importSnapshot(snapshot: SearchEngineSnapshot): Promise<void> {
    await this.ensureOpen();
    this.postings.clear();
    this.dirtyPostings.clear();
    this.termCache.clear();

    for (const entry of snapshot.postings) {
      const key = this.getPostingKey(entry.field, entry.term);
      const docMap = new Map<string, number>();
      for (const posting of entry.documents) {
        docMap.set(posting.docId, posting.termFrequency);
      }
      this.postings.set(key, docMap);
      this.dirtyPostings.add(key);
    }

    this.statsManager.load(snapshot.stats);
    await this.persistPostings();
  }

  async exportWorkerSnapshot(): Promise<WorkerSnapshotPayload> {
    const snapshot = await this.exportSnapshot();
    return toWorkerSnapshotPayload(snapshot);
  }

  async importWorkerSnapshot(payload: WorkerSnapshotPayload): Promise<void> {
    const snapshot = fromWorkerSnapshotPayload(payload);
    await this.importSnapshot(snapshot);
  }

  async destroy(): Promise<void> {
    await this.storage.deleteDatabase();
  }

  private async ensureOpen(): Promise<void> {
    if (!this.openPromise) {
      this.openPromise = this.storage.open();
    }
    await this.openPromise;
  }

  private async executeSearch(query: string, options?: SearchOptions): Promise<QueryResult | null> {
    await this.ensureOpen();

    const fields = options?.fields ?? this.fields;
    const tokens = this.buildQueryTokens(query, fields);
    if (tokens.length === 0) {
      return null;
    }

    return this.queryEngine.execute(tokens, {
      limit: options?.limit
    });
  }

  private upsertPosting(field: string, term: string, docId: DocId, frequency: number): void {
    const key = this.getPostingKey(field, term);
    const entry = this.postings.get(key) ?? new Map<string, number>();
    entry.set(this.docIdToKey(docId), frequency);
    this.postings.set(key, entry);
    this.dirtyPostings.add(key);
  }

  private async persistPostings(): Promise<void> {
    for (const key of this.dirtyPostings) {
      const docMap = this.postings.get(key);
      const [field, term] = key.split("::");
      if (!docMap || docMap.size === 0) {
        await this.storage.deleteTermChunksForTerm(field, term);
        this.termCache.delete(this.buildCacheKey(field, term));
        this.postings.delete(key);
        continue;
      }

      const postingsArray: TermPosting[] = Array.from(docMap.entries()).map(([docId, termFrequency]) => ({
        docId,
        termFrequency
      }));
      const serialized = postingsArray.map((entry) => JSON.stringify(entry));
      const { buffer, encoding } = encodePostings(serialized);
      const payloadView = new Uint8Array(buffer.byteLength);
      payloadView.set(buffer);
      const payload = payloadView.buffer;

      await this.storage.putTermChunk({
        key: { field, term, chunk: 0 },
        payload,
        docFrequency: postingsArray.length,
        inverseDocumentFrequency: undefined,
        encoding
      });

      this.termCache.set(this.buildCacheKey(field, term), {
        field,
        term,
        chunk: 0,
        postings: postingsArray,
        docFrequency: postingsArray.length,
        inverseDocumentFrequency: undefined
      });
    }
    this.dirtyPostings.clear();
  }

  private buildQueryTokens(query: string, fields: string[]): QueryToken[] {
    const tokenMap = new Map<string, QueryToken>();

    for (const field of fields) {
      const tokens = this.pipeline.run(field, query);
      for (const token of tokens) {
        const key = this.getPostingKey(field, token.value);
        if (!tokenMap.has(key)) {
          tokenMap.set(key, {
            field,
            term: token.value,
            boost: 1
          });
        }
      }
    }

    return Array.from(tokenMap.values());
  }

  private getPostingKey(field: string, term: string): string {
    return `${field}::${term}`;
  }

  private buildCacheKey(field: string, term: string): string {
    return `${field}:${term}`;
  }

  private docIdToKey(docId: DocId): string {
    return typeof docId === "string" ? docId : String(docId);
  }
}
