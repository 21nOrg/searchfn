import type { SearchEngineOptions, SearchEngineSnapshot } from "../search-engine";
import { SearchEngine } from "../search-engine";
import type {
  FlexSearchAddInput,
  FlexSearchQueryOptions,
  FlexSearchResult,
  FlexSearchWorkerSnapshot
} from "./types";

export interface DocumentIndexOptions extends SearchEngineOptions {
  document: {
    id: string;
    index: string[];
    store?: string[];
  };
}

export class FlexSearchDocumentAdapter {
  private readonly engine: SearchEngine;
  private readonly schema: DocumentIndexOptions["document"];

  constructor(options: DocumentIndexOptions) {
    this.engine = new SearchEngine(options);
    this.schema = options.document;
  }

  async add(input: FlexSearchAddInput): Promise<void> {
    const fields: Record<string, string> = {};
    for (const field of this.schema.index) {
      const value = input.fields[field];
      if (typeof value === "string") {
        fields[field] = value;
      }
    }
    await this.engine.add({
      id: input.id,
      fields,
      store: this.schema.store
        ? Object.fromEntries(
            this.schema.store.map((field) => [field, input.store?.[field] ?? input.fields[field]])
          )
        : undefined
    });
  }

  async search(query: string, options?: FlexSearchQueryOptions): Promise<FlexSearchResult[]> {
    const detailed = await this.engine.searchDetailed(query, {
      ...options,
      includeStored: true
    });

    return [
      {
        result: detailed.map((item) => item.docId),
        documents: detailed.map((item) => ({
          id: item.docId,
          score: item.score,
          document: item.document
        }))
      }
    ];
  }

  async remove(id: string | number): Promise<void> {
    await this.engine.remove(id);
  }

  async exportSnapshot(): Promise<SearchEngineSnapshot> {
    return this.engine.exportSnapshot();
  }

  async importSnapshot(snapshot: SearchEngineSnapshot): Promise<void> {
    await this.engine.importSnapshot(snapshot);
  }

  async exportWorkerSnapshot(): Promise<FlexSearchWorkerSnapshot> {
    return this.engine.exportWorkerSnapshot();
  }

  async importWorkerSnapshot(payload: FlexSearchWorkerSnapshot): Promise<void> {
    await this.engine.importWorkerSnapshot(payload);
  }
}
