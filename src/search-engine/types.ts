import type { TermPosting } from "../cache";

export interface SearchEngineSnapshot {
  postings: Array<{
    field: string;
    term: string;
    documents: TermPosting[];
  }>;
  stats: Array<{ docId: string; length: number }>;
}
