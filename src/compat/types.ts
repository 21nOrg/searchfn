import type {
  SearchOptions,
  AddDocumentInput,
  SearchEngineSnapshot,
  WorkerSnapshotPayload
} from "../search-engine";
import type { DocId } from "../types";

export interface FlexIndexOptions {
  cache?: {
    term?: number;
    vector?: number;
  };
  tokenize?: "strict" | "forward" | "full";
  preset?: "match" | "performance" | "memory";
}

export type FlexSearchAddInput = AddDocumentInput;

export interface FlexSearchQueryOptions extends SearchOptions {
  suggest?: boolean;
}

export interface FlexSearchDocumentHit {
  id: DocId;
  score: number;
  document?: Record<string, unknown>;
}

export interface FlexSearchResult {
  result: DocId[];
  documents?: FlexSearchDocumentHit[];
}

export type FlexSearchSnapshot = SearchEngineSnapshot;
export type FlexSearchWorkerSnapshot = WorkerSnapshotPayload;
