import { describe, expect, it } from "vitest";
import { PipelineEngine } from "../src/pipeline";

describe("PipelineEngine", () => {
  it("tokenizes, lowercases, and removes stop words", () => {
    const pipeline = new PipelineEngine();
    const tokens = pipeline.run("body", "The Quick Brown foxes", "doc-1");
    const values = tokens.map((token) => token.value);
    expect(values).toEqual(["quick", "brown", "foxes"]);
  });

  it("applies stemming when enabled", () => {
    const pipeline = new PipelineEngine({ enableStemming: true });
    const tokens = pipeline.run("body", "Processing processed items", "doc-1");
    const values = tokens.map((token) => token.value);
    expect(values).toEqual(["process", "process", "item"]);
  });

  it("can accept custom stop words", () => {
    const pipeline = new PipelineEngine({ stopWords: ["custom"] });
    const tokens = pipeline.run("body", "custom value remains", "doc-1");
    expect(tokens.map((token) => token.value)).toEqual(["value", "remains"]);
  });
});
