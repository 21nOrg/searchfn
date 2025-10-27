import type { DocId } from "../types";
import type { Pipeline } from "../pipeline";
import { PipelineEngine } from "../pipeline";
import { DocumentAccumulator } from "./document-accumulator";

export interface IndexingInputRecord {
  docId: DocId;
  fields: Record<string, string>;
}

export interface IngestedDocument {
  docId: DocId;
  fieldFrequencies: Map<string, Map<string, number>>;
  fieldLengths: Map<string, number>;
  totalLength: number;
}

export class Indexer {
  private readonly pipeline: Pipeline;

  constructor(pipeline?: Pipeline) {
    this.pipeline = pipeline ?? new PipelineEngine();
  }

  ingest(record: IndexingInputRecord): IngestedDocument {
    const accumulator = new DocumentAccumulator(record.docId);

    for (const [field, text] of Object.entries(record.fields)) {
      if (!text) continue;
      const tokens = this.pipeline.run(field, text, record.docId);
      for (const token of tokens) {
        accumulator.addToken(token);
      }
    }

    const stats = accumulator.toDocumentStatistics();
    const fieldFrequencies = new Map<string, Map<string, number>>();
    const fieldLengths = new Map<string, number>();
    let totalLength = 0;

    stats.fields.forEach((value, field) => {
      const frequencies = new Map<string, number>();
      value.termFrequencies.forEach((frequency, term) => {
        const numericFrequency = Number(frequency);
        const termFrequency = Number.isFinite(numericFrequency) && numericFrequency > 0 ? numericFrequency : 1;
        frequencies.set(term, termFrequency);
      });
      fieldFrequencies.set(field, frequencies);
      fieldLengths.set(field, value.length);
      totalLength += value.length;
    });

    return {
      docId: stats.docId,
      fieldFrequencies,
      fieldLengths,
      totalLength
    };
  }
}
