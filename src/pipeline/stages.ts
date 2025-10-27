import type { PipelineStage, PipelineContext, Token } from "./types";
import { DEFAULT_STOP_WORDS } from "./stop-words";

const TOKEN_REGEX = /[\p{L}\p{N}]+/gu;

const normalizeStage: PipelineStage = {
  name: "normalize",
  execute(tokens: Token[], context: PipelineContext): Token[] {
    void context;
    return tokens.map((token) => ({
      ...token,
      value: token.value.toLowerCase()
    }));
  }
};

const tokenizeStage: PipelineStage = {
  name: "tokenize",
  execute(tokens: Token[], context: PipelineContext): Token[] {
    if (tokens.length !== 1) {
      throw new Error("Tokenize stage expects a single seed token containing raw text");
    }
    const [seed] = tokens;
    const matches = seed.value.matchAll(TOKEN_REGEX);
    const generated: Token[] = [];
    for (const match of matches) {
      if (!match[0]) continue;
      generated.push({
        value: match[0],
        position: match.index ?? generated.length,
        field: context.field,
        documentId: context.documentId ?? null
      });
    }
    return generated;
  }
};

export function createStopWordStage(stopWords: Set<string>): PipelineStage {
  return {
    name: "stopWords",
    execute(tokens: Token[], context: PipelineContext): Token[] {
      void context;
      if (stopWords.size === 0) return tokens;
      return tokens.filter((token) => !stopWords.has(token.value));
    }
  };
}

export const stemStage: PipelineStage = {
  name: "stem",
  execute(tokens: Token[], context: PipelineContext): Token[] {
    void context;
    // Simple suffix trimming for plurals/gerunds; acts as a placeholder for more
    // sophisticated stemmers while remaining deterministic for tests.
    return tokens.map((token) => {
      let stemmed = token.value;
      if (stemmed.length > 4 && stemmed.endsWith("ing")) {
        stemmed = stemmed.slice(0, -3);
      } else if (stemmed.length > 3 && stemmed.endsWith("ed")) {
        stemmed = stemmed.slice(0, -2);
      } else if (stemmed.length > 2 && stemmed.endsWith("s")) {
        stemmed = stemmed.slice(0, -1);
      }
      return {
        ...token,
        value: stemmed
      };
    });
  }
};

export function buildDefaultStages(options?: { stopWords?: Set<string>; enableStemming?: boolean }): PipelineStage[] {
  const stages: PipelineStage[] = [tokenizeStage, normalizeStage];

  const stopWordSet = options?.stopWords ?? DEFAULT_STOP_WORDS;
  stages.push(createStopWordStage(stopWordSet));

  if (options?.enableStemming) {
    stages.push(stemStage);
  }

  return stages;
}
