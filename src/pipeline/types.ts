import type { DocId } from "../types";

export interface Token {
  value: string;
  position: number;
  field: string;
  documentId: DocId | null;
}

export interface PipelineContext {
  field: string;
  documentId: DocId | null;
}

export interface PipelineStage {
  name: string;
  execute(tokens: Token[], context: PipelineContext): Token[];
}

export interface PipelineOptions {
  enableStemming?: boolean;
  stopWords?: Iterable<string>;
  customStages?: PipelineStage[];
}

export interface Pipeline {
  run(field: string, text: string, documentId?: DocId): Token[];
}
