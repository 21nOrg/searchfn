# Fuzzy Matching, Autocomplete, and Partial Search Implementation Plan

## Problem Statement

Currently, both `SearchFn` and `InMemorySearchFn` only match complete tokens after tokenization:
- Searching "an" won't match "anthropic"
- Searching "anthro" won't match "anthropic"
- No fuzzy matching for typos (e.g., "anthopric" won't match "anthropic")

## Goals

1. **Partial/Prefix Search**: Match incomplete terms ("an" → "anthropic")
2. **Autocomplete**: Real-time suggestions as user types
3. **Fuzzy Matching**: Handle typos and spelling variations

## Approach Comparison

### Option 1: Edge N-Grams (RECOMMENDED FOR PARTIAL SEARCH)

**Concept**: At index time, generate all prefixes of terms starting from minimum length.

**Example**: "anthropic" with minLength=2 generates:
- "an", "ant", "anth", "anthr", "anthro", "anthrop", "anthropi", "anthropic"

**Pros**:
- ✅ Fast query time (simple term lookup)
- ✅ Works with existing inverted index structure
- ✅ Predictable memory overhead
- ✅ No query-time expansion needed
- ✅ Compatible with BM25 scoring

**Cons**:
- ❌ Index size increase (~2-4x for typical text)
- ❌ Slower indexing
- ❌ Not suitable for fuzzy matching

**Implementation Complexity**: Low (1-2 days)

**Storage Impact**:
- In-memory: Moderate (acceptable for ephemeral data)
- IndexedDB: Moderate (more posting lists to store)

---

### Option 2: Query-Time Expansion (RECOMMENDED FOR FUZZY)

**Concept**: At query time, expand terms to include similar variants using edit distance.

**Example**: "anthopric" expands to terms within edit distance 2:
- Check "anthropic", "anthopric", "anthropoc", etc.

**Pros**:
- ✅ No index changes required
- ✅ Excellent for fuzzy matching
- ✅ Configurable per-query
- ✅ Works for rare terms

**Cons**:
- ❌ Slower queries (need to check multiple terms)
- ❌ Poor for short queries (too many candidates)
- ❌ Requires efficient term enumeration

**Implementation Complexity**: Medium (2-3 days)

**Storage Impact**: None (query-time only)

---

### Option 3: Radix Tree (COMPREHENSIVE BUT COMPLEX)

**Concept**: Replace Map-based index with radix tree (compressed prefix trie).

**Example**: Terms share common prefixes in tree structure:
```
ant
├─arctic
├─hropology
└─hropomorphic
```

**Pros**:
- ✅ Efficient prefix search
- ✅ Memory savings (shared prefixes)
- ✅ Fast prefix enumeration
- ✅ Enables autocomplete

**Cons**:
- ❌ Major refactoring required
- ❌ Complex implementation
- ❌ Harder to debug
- ❌ IndexedDB storage becomes complex

**Implementation Complexity**: High (1-2 weeks)

**Storage Impact**: 
- In-memory: Reduced (20-30% savings)
- IndexedDB: Requires new serialization strategy

---

### Option 4: Hybrid N-Gram + Edit Distance (BEST OF BOTH)

**Concept**: Use edge n-grams for short queries, edit distance for longer terms.

**Logic**:
- Query length ≤ 3: Use n-gram index (fast, handles "an" → "anthropic")
- Query length > 3: Use edit distance (handles "anthopric" → "anthropic")

**Pros**:
- ✅ Combines benefits of both approaches
- ✅ Optimizes for common use cases
- ✅ Configurable thresholds

**Cons**:
- ❌ Two code paths to maintain
- ❌ Still has index size overhead

**Implementation Complexity**: Medium-High (3-4 days)

---

## Recommended Implementation Plan

### Phase 1: Edge N-Grams for Prefix/Autocomplete (Week 1)

**Target**: Enable "an" → "anthropic" matching

#### Changes Required:

**1. Pipeline Extension**
```typescript
// src/pipeline/stages/edge-ngram-stage.ts
export class EdgeNGramStage implements PipelineStage {
  constructor(
    private minGram: number = 2,
    private maxGram: number = 15
  ) {}

  execute(tokens: Token[], context: PipelineContext): Token[] {
    const result: Token[] = [];
    for (const token of tokens) {
      const term = token.value;
      if (term.length < this.minGram) {
        result.push(token);
        continue;
      }
      
      // Generate all prefixes
      for (let i = this.minGram; i <= Math.min(term.length, this.maxGram); i++) {
        result.push({
          ...token,
          value: term.substring(0, i),
          metadata: { originalTerm: term, isPrefix: i < term.length }
        });
      }
    }
    return result;
  }
}
```

**2. Pipeline Configuration**
```typescript
const engine = new SearchFn({
  name: "autocomplete-index",
  fields: ["title", "body"],
  pipeline: {
    enableEdgeNGrams: true,
    edgeNGramMinLength: 2,
    edgeNGramMaxLength: 15
  }
});
```

**3. Scoring Adjustment**
```typescript
// Boost exact matches over prefix matches
if (posting.metadata?.isPrefix) {
  scoreContribution *= 0.7; // Prefix match penalty
}
```

**4. Query Options**
```typescript
interface SearchOptions {
  fields?: string[];
  limit?: number;
  prefixMatch?: boolean; // Enable/disable prefix matching
}
```

#### Estimated Impact:
- Index size: +150-200% (3 n-grams per term on average)
- Query speed: No change (same lookup mechanism)
- Indexing speed: -30% slower
- Memory (in-memory): +2-3x
- Storage (IndexedDB): +2-3x

---

### Phase 2: Fuzzy Matching via Edit Distance (Week 2)

**Target**: Enable "anthopric" → "anthropic" matching

#### Changes Required:

**1. Levenshtein Distance Utility**
```typescript
// src/utils/levenshtein.ts
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

export function fuzzyExpand(
  term: string,
  maxDistance: number,
  vocabulary: Set<string>
): string[] {
  const candidates: string[] = [];
  for (const vocabTerm of vocabulary) {
    if (Math.abs(vocabTerm.length - term.length) > maxDistance) {
      continue; // Length difference too large
    }
    if (levenshteinDistance(term, vocabTerm) <= maxDistance) {
      candidates.push(vocabTerm);
    }
  }
  return candidates;
}
```

**2. Vocabulary Tracking**
```typescript
// Track all unique terms for fuzzy expansion
class SearchFn {
  private vocabulary = new Set<string>();
  
  async add(input: AddDocumentInput): Promise<void> {
    // ... existing code ...
    for (const [field, termFrequencies] of ingest.fieldFrequencies.entries()) {
      for (const term of termFrequencies.keys()) {
        this.vocabulary.add(term);
      }
    }
  }
}
```

**3. Query Expansion**
```typescript
private buildQueryTokens(
  query: string,
  fields: string[],
  fuzzyDistance?: number
): QueryToken[] {
  const tokenMap = new Map<string, QueryToken>();

  for (const field of fields) {
    const tokens = this.pipeline.run(field, query);
    for (const token of tokens) {
      const terms = fuzzyDistance
        ? fuzzyExpand(token.value, fuzzyDistance, this.vocabulary)
        : [token.value];
      
      for (const term of terms) {
        const key = this.getPostingKey(field, term);
        if (!tokenMap.has(key)) {
          tokenMap.set(key, {
            field,
            term,
            boost: term === token.value ? 1 : 0.8 // Exact match boost
          });
        }
      }
    }
  }

  return Array.from(tokenMap.values());
}
```

**4. Search API**
```typescript
interface SearchOptions {
  fields?: string[];
  limit?: number;
  prefixMatch?: boolean;
  fuzzy?: number | boolean; // Edit distance or true for default (2)
}

await engine.search("anthopric", { fuzzy: 2 });
```

#### Estimated Impact:
- Index size: No change
- Query speed: -50% for fuzzy queries (need to check multiple terms)
- Memory: +1-2MB for vocabulary set
- Works better for longer queries (>4 characters)

---

### Phase 3: Optimization & Hybrid Strategy (Week 3)

#### Smart Mode Selection
```typescript
interface SearchOptions {
  fields?: string[];
  limit?: number;
  mode?: 'exact' | 'prefix' | 'fuzzy' | 'auto';
}

private determineMode(query: string, options?: SearchOptions): SearchMode {
  if (options?.mode && options.mode !== 'auto') {
    return options.mode;
  }
  
  // Auto-detection
  const tokens = this.pipeline.run('_', query);
  const avgLength = tokens.reduce((sum, t) => sum + t.value.length, 0) / tokens.length;
  
  if (avgLength <= 3) return 'prefix';  // Short queries: use prefix
  if (avgLength >= 8) return 'fuzzy';   // Long queries: use fuzzy
  return 'exact';                        // Medium: exact match
}
```

#### Caching for Fuzzy Expansion
```typescript
// Cache fuzzy expansions to avoid recomputation
private fuzzyCache = new LruCache<string[]>({ maxEntries: 1000 });

private expandFuzzy(term: string, maxDistance: number): string[] {
  const cacheKey = `${term}:${maxDistance}`;
  let expanded = this.fuzzyCache.get(cacheKey);
  if (!expanded) {
    expanded = fuzzyExpand(term, maxDistance, this.vocabulary);
    this.fuzzyCache.set(cacheKey, expanded);
  }
  return expanded;
}
```

---

## Alternative: BK-Tree for Efficient Fuzzy Lookup

For very large vocabularies (>100k terms), consider a BK-Tree instead of linear scan.

**BK-Tree Properties**:
- Organizes terms by edit distance
- Prunes search space efficiently
- O(log n) average case for fuzzy lookup

**Implementation**:
```typescript
class BKTreeNode {
  term: string;
  children = new Map<number, BKTreeNode>();
}

class BKTree {
  root?: BKTreeNode;
  
  add(term: string): void {
    if (!this.root) {
      this.root = { term, children: new Map() };
      return;
    }
    
    let current = this.root;
    while (true) {
      const distance = levenshteinDistance(term, current.term);
      if (distance === 0) return; // Already exists
      
      const child = current.children.get(distance);
      if (!child) {
        current.children.set(distance, { term, children: new Map() });
        return;
      }
      current = child;
    }
  }
  
  search(term: string, maxDistance: number): string[] {
    if (!this.root) return [];
    
    const results: string[] = [];
    const queue: BKTreeNode[] = [this.root];
    
    while (queue.length > 0) {
      const node = queue.shift()!;
      const distance = levenshteinDistance(term, node.term);
      
      if (distance <= maxDistance) {
        results.push(node.term);
      }
      
      // Prune: only explore children within possible range
      const minDist = Math.max(0, distance - maxDistance);
      const maxDist = distance + maxDistance;
      
      for (const [childDist, child] of node.children) {
        if (childDist >= minDist && childDist <= maxDist) {
          queue.push(child);
        }
      }
    }
    
    return results;
  }
}
```

**When to Use**: Vocabulary > 50,000 terms or fuzzy queries > 10% of total queries

---

## Implementation Checklist

### Phase 1: Prefix Search (Priority: High)
- [ ] Implement EdgeNGramStage pipeline stage
- [ ] Add `enableEdgeNGrams` option to PipelineOptions
- [ ] Update SearchFn to support prefix matching
- [ ] Update InMemorySearchFn to support prefix matching
- [ ] Add scoring adjustments for prefix vs exact matches
- [ ] Write tests for prefix matching
- [ ] Update documentation
- [ ] Add example: autocomplete search

### Phase 2: Fuzzy Matching (Priority: Medium)
- [ ] Implement Levenshtein distance utility
- [ ] Add vocabulary tracking to SearchFn/InMemorySearchFn
- [ ] Implement fuzzy query expansion
- [ ] Add `fuzzy` option to SearchOptions
- [ ] Add fuzzy expansion caching
- [ ] Write tests for fuzzy matching
- [ ] Update documentation
- [ ] Add example: typo-tolerant search

### Phase 3: Optimization (Priority: Low)
- [ ] Implement auto mode detection
- [ ] Add hybrid strategy (prefix for short, fuzzy for long)
- [ ] Implement BK-Tree (optional, for large vocabularies)
- [ ] Add performance benchmarks
- [ ] Tune default parameters (minGram, maxDistance)
- [ ] Add configuration guide

---

## Configuration Examples

### Autocomplete Use Case
```typescript
const autocomplete = new InMemorySearchFn({
  fields: ["title"],
  pipeline: {
    enableEdgeNGrams: true,
    edgeNGramMinLength: 2,
    edgeNGramMaxLength: 10,
    enableStemming: false // Keep exact prefixes
  }
});

const suggestions = autocomplete.search("anth", {
  mode: 'prefix',
  limit: 5
});
```

### Typo-Tolerant Search
```typescript
const search = new SearchFn({
  name: "main-index",
  fields: ["title", "body"],
  pipeline: {
    enableStemming: true,
    stopWords: ["the", "a", "an"]
  }
});

const results = await search.search("anthopric clode", {
  fuzzy: 2,
  limit: 10
});
```

### Hybrid Mode
```typescript
const hybrid = new InMemorySearchFn({
  fields: ["name", "description"],
  pipeline: {
    enableEdgeNGrams: true,
    edgeNGramMinLength: 2,
    edgeNGramMaxLength: 15
  }
});

// Auto-detects: short query uses prefix, long query uses fuzzy
const results = hybrid.search(userInput, { mode: 'auto', fuzzy: 2 });
```

---

## Performance Considerations

### Index Size Management

**Problem**: Edge n-grams can triple index size.

**Solutions**:
1. **Selective fields**: Only apply to specific fields
   ```typescript
   pipeline: {
     fieldConfig: {
       title: { enableEdgeNGrams: true },
       body: { enableEdgeNGrams: false }
     }
   }
   ```

2. **Length limits**: Cap n-gram generation
   ```typescript
   edgeNGramMaxLength: 10 // Don't index beyond 10 characters
   ```

3. **Frequency-based pruning**: Skip n-grams for very common terms
   ```typescript
   edgeNGramSkipCommon: true // Skip stop words
   ```

### Query Performance

**Problem**: Fuzzy expansion can check many terms.

**Solutions**:
1. **Distance limits**: Lower max distance (1-2)
2. **Length filtering**: Pre-filter by length difference
3. **BK-Tree**: For vocabularies > 50k terms
4. **Caching**: Cache fuzzy expansions

### Memory Usage

**In-Memory Impact**:
- Edge n-grams: +2-3x memory
- Vocabulary set: ~100 bytes per unique term
- Fuzzy cache: Configurable LRU

**IndexedDB Impact**:
- Edge n-grams: +2-3x storage
- More posting lists to fetch at query time
- Consider compression for large indexes

---

## Testing Strategy

### Unit Tests
- [ ] Edge n-gram generation
- [ ] Levenshtein distance calculation
- [ ] Fuzzy expansion logic
- [ ] Vocabulary tracking
- [ ] Scoring adjustments

### Integration Tests
- [ ] Prefix search end-to-end
- [ ] Fuzzy search end-to-end
- [ ] Hybrid mode selection
- [ ] IndexedDB persistence with n-grams

### Performance Tests
- [ ] Index size benchmarks
- [ ] Query latency benchmarks
- [ ] Memory usage profiling
- [ ] Fuzzy expansion timing

---

## Migration Path

### Backward Compatibility

**Concern**: Existing indexes won't have n-grams.

**Solution**: Progressive enhancement
```typescript
const engine = new SearchFn({
  name: "legacy-index",
  fields: ["title"],
  pipeline: {
    enableEdgeNGrams: false // Default to off
  }
});

// Opt-in per search
await engine.search("query", { prefixMatch: true });
```

### Re-indexing

**For existing data**:
```typescript
// Check if index has n-gram support
const hasNGrams = await engine.hasFeature('edgeNGrams');

if (!hasNGrams && needsPrefixSearch) {
  // Re-index with new pipeline
  await engine.clear();
  await engine.rebuildIndex(documents, {
    pipeline: { enableEdgeNGrams: true }
  });
}
```

---

## Recommendation Summary

**Immediate (Week 1-2)**:
1. ✅ Implement **edge n-grams** for prefix/autocomplete
   - Solves: "an" → "anthropic"
   - Impact: 2-3x index size, but acceptable for use case
   - Complexity: Low

2. ✅ Implement **query-time fuzzy expansion** with Levenshtein
   - Solves: "anthopric" → "anthropic"
   - Impact: Minimal storage, slower fuzzy queries
   - Complexity: Medium

**Future Optimizations (Week 3+)**:
3. ⚠️ Add **BK-Tree** if vocabulary > 50k terms
4. ⚠️ Implement **selective n-grams** (per-field config)
5. ⚠️ Consider **radix tree** for major memory savings (long-term refactor)

**Do NOT do** (unless strong need):
- ❌ Full n-grams (explosive index growth)
- ❌ Soundex/phonetic encoding (limited utility for code/names)
- ❌ Bitap algorithm (complex, overlaps with edit distance)
