import {
  SearchEngine,
  type SearchEngineOptions,
  type SearchEngineSnapshot
} from "../search-engine";
import type {
  FlexIndexOptions,
  FlexSearchAddInput,
  FlexSearchQueryOptions,
  FlexSearchWorkerSnapshot
} from "./types";

export class FlexSearchIndexAdapter {
  private readonly engine: SearchEngine;

  constructor(options: FlexIndexOptions & SearchEngineOptions) {
    this.engine = new SearchEngine({
      ...options,
      cache: {
        terms: options.cache?.term,
        vectors: options.cache?.vector
      }
    });
  }

  async addAsync(id: string | number, text: string): Promise<void> {
    await this.engine.add({
      id,
      fields: {
        text
      }
    });
  }

  async addDocument(input: FlexSearchAddInput): Promise<void> {
    await this.engine.add(input);
  }

  async searchAsync(query: string, options?: FlexSearchQueryOptions): Promise<(string | number)[]> {
    return this.engine.search(query, options);
  }

  async searchCacheAsync(query: string, options?: FlexSearchQueryOptions): Promise<(string | number)[]> {
    return this.searchAsync(query, options);
  }

  async removeAsync(id: string | number): Promise<void> {
    await this.engine.remove(id);
  }

  async clear(): Promise<void> {
    await this.engine.destroy();
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
