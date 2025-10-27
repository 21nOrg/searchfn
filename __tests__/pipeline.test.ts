import { describe, expect, it } from "vitest";
import { PipelineEngine } from "../src/pipeline";
import { buildDefaultStages } from "../src/pipeline/stages";
import { EnglishStemmer, NoOpStemmer } from "../src/pipeline/stemmers";
import { STOP_WORDS_ES, STOP_WORDS_FR } from "../src/pipeline/stop-words";
import type { PipelineContext, PipelineStage, Stemmer, Token } from "../src/pipeline/types";

describe("PipelineEngine", () => {
  describe("backwards compatibility", () => {
    it("tokenizes, lowercases, and removes stop words (English default)", () => {
      const pipeline = new PipelineEngine();
      const tokens = pipeline.run("body", "The Quick Brown foxes", "doc-1");
      const values = tokens.map((token) => token.value);
      expect(values).toEqual(["quick", "brown", "foxes"]);
    });

    it("applies stemming when enabled", () => {
      const pipeline = new PipelineEngine({ enableStemming: true });
      const tokens = pipeline.run("body", "running jumped items processing", "doc-1");
      const values = tokens.map((token) => token.value);
      // running -> run, jumped -> jump, items -> item, processing -> process
      expect(values).toEqual(["run", "jump", "item", "process"]);
    });

    it("can accept custom stop words", () => {
      const pipeline = new PipelineEngine({ stopWords: ["custom"] });
      const tokens = pipeline.run("body", "custom value remains", "doc-1");
      expect(tokens.map((token) => token.value)).toEqual(["value", "remains"]);
    });
  });

  describe("tokenization details", () => {
    it("retains numeric tokens and reports their positions", () => {
      const pipeline = new PipelineEngine();
      const tokens = pipeline.run("body", "The quick, brown! 42??", "doc-1");
      expect(tokens.map((token) => token.value)).toEqual(["quick", "brown", "42"]);
      expect(tokens.map((token) => token.position)).toEqual([4, 11, 18]);
    });

    it("returns an empty array for empty input", () => {
      const pipeline = new PipelineEngine();
      const tokens = pipeline.run("body", "", "doc-1");
      expect(tokens).toEqual([]);
    });
  });

  describe("language support", () => {
    it("uses Spanish stop words when language is 'es'", () => {
      const pipeline = new PipelineEngine({ language: "es" });
      const tokens = pipeline.run("body", "el perro y el gato", "doc-1");
      const values = tokens.map((token) => token.value);
      // "el" and "y" are Spanish stop words
      expect(values).toEqual(["perro", "gato"]);
    });

    it("uses French stop words when language is 'fr'", () => {
      const pipeline = new PipelineEngine({ language: "fr" });
      const tokens = pipeline.run("body", "le chat et le chien", "doc-1");
      const values = tokens.map((token) => token.value);
      // "le" and "et" are French stop words
      expect(values).toEqual(["chat", "chien"]);
    });

    it("uses English stop words when language is 'en'", () => {
      const pipeline = new PipelineEngine({ language: "en" });
      const tokens = pipeline.run("body", "the cat and the dog", "doc-1");
      const values = tokens.map((token) => token.value);
      expect(values).toEqual(["cat", "dog"]);
    });

    it("defaults to English for unknown language", () => {
      const pipeline = new PipelineEngine({ language: "unknown" });
      const tokens = pipeline.run("body", "the cat and the dog", "doc-1");
      const values = tokens.map((token) => token.value);
      expect(values).toEqual(["cat", "dog"]);
    });
  });

  describe("custom stages", () => {
    it("receives pipeline context and processes normalized tokens", () => {
      const contexts: PipelineContext[] = [];
      const observedValues: string[][] = [];

      const recordStage: PipelineStage = {
        name: "record",
        execute(tokens, context) {
          contexts.push(context);
          observedValues.push(tokens.map((token) => token.value));
          return tokens;
        }
      };

      const pipeline = new PipelineEngine({ customStages: [recordStage] });
      const tokens = pipeline.run("body", "Custom Stage", "doc-1");

      expect(tokens.map((token) => token.value)).toEqual(["custom", "stage"]);
      expect(contexts).toHaveLength(1);
      expect(contexts[0]).toEqual({ field: "body", documentId: "doc-1" });
      expect(observedValues[0]).toEqual(["custom", "stage"]);
    });

    it("can short-circuit the pipeline by returning no tokens", () => {
      const terminatingStage: PipelineStage = {
        name: "terminate",
        execute() {
          return [];
        }
      };

      const pipeline = new PipelineEngine({ customStages: [terminatingStage] });
      const tokens = pipeline.run("body", "Should be removed", "doc-1");
      expect(tokens).toEqual([]);
    });
  });

  describe("custom stemmer", () => {
    it("uses provided stemmer when specified", () => {
      class TestStemmer implements Stemmer {
        stem(token: string): string {
          return token.endsWith("ing") ? token.slice(0, -3) : token;
        }
      }

      const pipeline = new PipelineEngine({ 
        enableStemming: true,
        stemmer: new TestStemmer() 
      });
      const tokens = pipeline.run("body", "running jumping walking", "doc-1");
      const values = tokens.map((token) => token.value);
      expect(values).toEqual(["runn", "jump", "walk"]);
    });

    it("uses NoOpStemmer when stemming disabled", () => {
      const pipeline = new PipelineEngine({ 
        enableStemming: false
      });
      const tokens = pipeline.run("body", "running foxes", "doc-1");
      const values = tokens.map((token) => token.value);
      // No stemming applied
      expect(values).toEqual(["running", "foxes"]);
    });

    it("uses EnglishStemmer by default when enableStemming is true", () => {
      const pipeline = new PipelineEngine({ enableStemming: true });
      const tokens = pipeline.run("body", "running foxes", "doc-1");
      const values = tokens.map((token) => token.value);
      // EnglishStemmer: running -> run, foxes -> foxe
      expect(values).toEqual(["run", "foxe"]);
    });
  });

  describe("language with stemming", () => {
    it("uses English stemmer for 'en' language with stemming", () => {
      const pipeline = new PipelineEngine({ 
        language: "en",
        enableStemming: true 
      });
      const tokens = pipeline.run("body", "running jumped", "doc-1");
      const values = tokens.map((token) => token.value);
      expect(values).toEqual(["run", "jump"]);
    });

    it("uses NoOpStemmer for non-English languages with stemming", () => {
      const pipeline = new PipelineEngine({ 
        language: "es",
        enableStemming: true 
      });
      const tokens = pipeline.run("body", "corriendo procesando", "doc-1");
      const values = tokens.map((token) => token.value);
      // NoOpStemmer - no changes
      expect(values).toEqual(["corriendo", "procesando"]);
    });
  });

  describe("explicit options override language defaults", () => {
    it("custom stop words override language-based stop words", () => {
      const pipeline = new PipelineEngine({ 
        language: "es",
        stopWords: ["custom"]
      });
      const tokens = pipeline.run("body", "el custom perro", "doc-1");
      const values = tokens.map((token) => token.value);
      // Only "custom" is filtered, not "el" (Spanish stop word)
      expect(values).toEqual(["el", "perro"]);
    });

    it("custom stemmer overrides language-based stemmer", () => {
      class UpperStemmer implements Stemmer {
        stem(token: string): string {
          return token.toUpperCase();
        }
      }

      const pipeline = new PipelineEngine({ 
        language: "en",
        enableStemming: true,
        stemmer: new UpperStemmer()
      });
      const tokens = pipeline.run("body", "running", "doc-1");
      const values = tokens.map((token) => token.value);
      expect(values).toEqual(["RUNNING"]);
    });
  });

  describe("stage primitives", () => {
    it("throws when tokenize stage receives multiple seed tokens", () => {
      const [tokenizeStage] = buildDefaultStages();
      const context: PipelineContext = { field: "body", documentId: "doc-1" };
      const tokens: Token[] = [
        { value: "alpha", position: 0, field: "body", documentId: "doc-1" },
        { value: "beta", position: 1, field: "body", documentId: "doc-1" }
      ];

      expect(() => tokenizeStage.execute(tokens, context)).toThrow(
        "Tokenize stage expects a single seed token containing raw text"
      );
    });
  });
});
