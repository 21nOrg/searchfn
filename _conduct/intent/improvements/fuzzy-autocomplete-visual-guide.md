# Visual Guide: Fuzzy Matching & Autocomplete Implementation

## Current Behavior vs. Desired Behavior

### Scenario 1: Searching "an" for "anthropic"

**Current (Exact Token Matching)**
```
User types: "an"
           ↓
    Tokenize: ["an"]
           ↓
    Index lookup: "an" 
           ↓
    Result: ❌ NO MATCH
    (Index only has "anthropic", not "an")
```

**With Edge N-Grams (Proposed)**
```
Indexing: "anthropic" → ["an", "ant", "anth", ..., "anthropic"]
           ↓
User types: "an"
           ↓
    Tokenize: ["an"]
           ↓
    Index lookup: "an"
           ↓
    Result: ✅ MATCH found!
    Documents containing "anthropic" returned
```

---

### Scenario 2: Searching "anthopric" (typo) for "anthropic"

**Current (No Fuzzy Matching)**
```
User types: "anthopric"
           ↓
    Tokenize: ["anthopric"]
           ↓
    Index lookup: "anthopric"
           ↓
    Result: ❌ NO MATCH
    (Exact match required)
```

**With Fuzzy Expansion (Proposed)**
```
User types: "anthopric"
           ↓
    Tokenize: ["anthopric"]
           ↓
    Fuzzy expand (distance=2):
    Check vocabulary for similar terms
           ↓
    Found: "anthropic" (edit distance = 2)
           ↓
    Index lookup: "anthropic"
           ↓
    Result: ✅ MATCH found!
    Documents containing "anthropic" returned
```

---

## Index Structure Comparison

### Current Index (Exact Match Only)

```
Inverted Index:
┌──────────────┬─────────────────────┐
│ Term         │ Documents           │
├──────────────┼─────────────────────┤
│ anthropic    │ [doc1, doc4]        │
│ claude       │ [doc1]              │
│ assistant    │ [doc1]              │
│ openai       │ [doc2]              │
│ chatgpt      │ [doc2]              │
└──────────────┴─────────────────────┘

Query "an" → Lookup "an" → NOT FOUND ❌
Query "anth" → Lookup "anth" → NOT FOUND ❌
```

### With Edge N-Grams (Prefix Support)

```
Inverted Index (with n-grams):
┌──────────────┬─────────────────────┐
│ Term         │ Documents           │
├──────────────┼─────────────────────┤
│ an           │ [doc1, doc4]        │ ← New!
│ ant          │ [doc1, doc4]        │ ← New!
│ anth         │ [doc1, doc4]        │ ← New!
│ anthr        │ [doc1, doc4]        │ ← New!
│ anthro       │ [doc1, doc4]        │ ← New!
│ anthrop      │ [doc1, doc4]        │ ← New!
│ anthropi     │ [doc1, doc4]        │ ← New!
│ anthropic    │ [doc1, doc4]        │ ← Original
│ cl           │ [doc1]              │ ← New!
│ cla          │ [doc1]              │ ← New!
│ clau         │ [doc1]              │ ← New!
│ claud        │ [doc1]              │ ← New!
│ claude       │ [doc1]              │ ← Original
│ assistant    │ [doc1]              │
│ openai       │ [doc2]              │
└──────────────┴─────────────────────┘

Query "an" → Lookup "an" → FOUND ✅
Query "anth" → Lookup "anth" → FOUND ✅
Query "clau" → Lookup "clau" → FOUND ✅
```

**Index Size**: ~6x larger (but worth it for autocomplete!)

---

## Fuzzy Matching: Query Expansion Flow

### Example: "anthopric" → "anthropic"

```
Step 1: User Query
┌─────────────┐
│ "anthopric" │
└─────────────┘
       ↓
Step 2: Check Vocabulary
┌───────────────────────────────────────┐
│ Vocabulary Set:                       │
│ ["anthropic", "claude", "assistant",  │
│  "openai", "chatgpt", ...]            │
└───────────────────────────────────────┘
       ↓
Step 3: Calculate Edit Distance (Levenshtein)
┌──────────────┬──────────┬──────────────────────┐
│ Vocab Term   │ Distance │ Within Limit (≤2)?  │
├──────────────┼──────────┼──────────────────────┤
│ anthropic    │    2     │ ✅ YES              │
│ claude       │    9     │ ❌ NO               │
│ assistant    │    9     │ ❌ NO               │
│ openai       │    8     │ ❌ NO               │
└──────────────┴──────────┴──────────────────────┘
       ↓
Step 4: Expanded Query Terms
┌─────────────┐
│ "anthropic" │  ← Use this to search index
└─────────────┘
       ↓
Step 5: Index Lookup
┌──────────────┬─────────────────────┐
│ anthropic    │ [doc1, doc4]        │ ✅ MATCH!
└──────────────┴─────────────────────┘
```

### Optimization: Length Pre-filtering

```
Query: "anthopric" (9 chars)
Max distance: 2
      ↓
Only check vocabulary terms with length 7-11
      ↓
Skip terms like:
  "ai" (2 chars) → |9-2| = 7 > 2 ❌
  "assistant" (9 chars) → |9-9| = 0 ≤ 2 ✅
  "anthropology" (12 chars) → |12-9| = 3 > 2 ❌
      ↓
Reduces comparisons by ~60-70%!
```

---

## Hybrid Strategy: Smart Mode Selection

### Decision Tree

```
User Query
    ↓
    Is mode='auto'?
    ├─ No → Use specified mode
    └─ Yes ↓
         ┌──────────────────────────────┐
         │ Calculate average token      │
         │ length from query            │
         └──────────────────────────────┘
                ↓
    ┌───────────┴───────────┐
    ↓                       ↓
 Length ≤ 3?            Length ≥ 8?
    ↓                       ↓
  PREFIX                  FUZZY
  Search                  Search
    │                       │
    │                       │
    └───────┬───────────────┘
            ↓
         4-7 chars?
            ↓
          EXACT
          Search
```

### Examples

```
Query: "an"          (2 chars)  → PREFIX mode
   ├─ Use n-gram index
   └─ Fast lookup: O(1)

Query: "claude"      (6 chars)  → EXACT mode
   ├─ Regular token match
   └─ Fast lookup: O(1)

Query: "anthropology" (12 chars) → FUZZY mode
   ├─ Expand with edit distance
   └─ Slower: O(n) with vocabulary scan
   └─ But handles typos well!
```

---

## Memory & Performance Impact

### Index Size Growth (with Edge N-Grams)

```
Example: 1,000 documents, 10,000 unique terms

Current Index:
┌────────────────────┐
│ 10,000 terms       │  ← Base size
│ ~500KB memory      │
└────────────────────┘

With Edge N-Grams (min=2, max=15):
┌────────────────────┐
│ 10,000 terms       │  Base
│   × 6 (avg n-grams)│  Multiplier
│ = 60,000 terms     │
│ ~3MB memory        │  ← 6x increase
└────────────────────┘

With Selective N-Grams (title only):
┌────────────────────┐
│ Title: 2,000 terms │
│   × 6 = 12,000     │
│ Body: 8,000 terms  │
│   × 1 = 8,000      │
│ = 20,000 terms     │
│ ~1MB memory        │  ← Only 2x increase!
└────────────────────┘
```

### Query Performance

```
Exact Match (Current):
  ┌──────────┐
  │ O(1)     │  Hash map lookup
  │ <1ms     │
  └──────────┘

Prefix Match (with N-Grams):
  ┌──────────┐
  │ O(1)     │  Hash map lookup (same!)
  │ <1ms     │  No performance hit
  └──────────┘

Fuzzy Match (without optimization):
  ┌──────────┐
  │ O(n)     │  Check all vocabulary terms
  │ 10-50ms  │  For 10,000 terms
  └──────────┘

Fuzzy Match (with length filter):
  ┌──────────┐
  │ O(n/3)   │  Skip ~66% of terms
  │ 3-15ms   │
  └──────────┘

Fuzzy Match (with BK-Tree):
  ┌──────────┐
  │ O(log n) │  Tree traversal
  │ 1-5ms    │  Even for 100k terms!
  └──────────┘
```

---

## Implementation Phases

### Phase 1: Edge N-Grams (Week 1)

```
Pipeline Stage Addition:
┌─────────────────────────────────┐
│ Input:  "anthropic"             │
│         ↓                        │
│ Tokenize: ["anthropic"]         │
│         ↓                        │
│ EdgeNGramStage:                 │
│   min=2, max=15                 │
│         ↓                        │
│ Output: ["an", "ant", "anth",   │
│          "anthr", "anthro",     │
│          "anthrop", "anthropi", │
│          "anthropic"]           │
└─────────────────────────────────┘

Result: "an" now matches! ✅
```

### Phase 2: Fuzzy Matching (Week 2)

```
Query Processing Addition:
┌─────────────────────────────────┐
│ Query: "anthopric"              │
│         ↓                        │
│ Tokenize: ["anthopric"]         │
│         ↓                        │
│ FuzzyExpansion (if enabled):    │
│   - Load vocabulary             │
│   - Filter by length            │
│   - Calculate distances         │
│   - Keep within threshold       │
│         ↓                        │
│ Expanded: ["anthropic"]         │
│         ↓                        │
│ Index Lookup: "anthropic"       │
└─────────────────────────────────┘

Result: Typo handled! ✅
```

### Phase 3: Optimization (Week 3)

```
Performance Optimizations:
┌─────────────────────────────────┐
│ 1. Selective N-Grams            │
│    - Title: Full n-grams        │
│    - Body: No n-grams           │
│         ↓                        │
│ 2. Fuzzy Cache                  │
│    - LRU cache (1000 entries)   │
│    - Cache key: "term:distance" │
│         ↓                        │
│ 3. BK-Tree (if needed)          │
│    - Build from vocabulary      │
│    - O(log n) fuzzy lookup      │
└─────────────────────────────────┘
```

---

## API Design Examples

### Configuration

```typescript
// Autocomplete-focused (prefix search)
const autocomplete = new InMemorySearchFn({
  fields: ["title"],
  pipeline: {
    enableEdgeNGrams: true,      // Turn on prefix matching
    edgeNGramMinLength: 2,        // Start from 2 characters
    edgeNGramMaxLength: 10,       // Cap at 10 characters
    enableStemming: false         // Keep exact prefixes
  }
});

// Typo-tolerant search
const search = new SearchFn({
  name: "main-index",
  fields: ["title", "body"],
  pipeline: {
    enableEdgeNGrams: false,      // No prefix (save space)
    enableStemming: true          // Normalize variations
  }
});

// Hybrid: Both prefix + fuzzy
const hybrid = new InMemorySearchFn({
  fields: ["name", "description"],
  pipeline: {
    enableEdgeNGrams: true,       // Prefix support
    edgeNGramMinLength: 2,
    edgeNGramMaxLength: 15
  }
});
```

### Search Queries

```typescript
// Autocomplete as you type
const suggestions = autocomplete.search("anth", {
  mode: 'prefix',    // Use n-gram index
  limit: 5
});
// → ["anthropic", "anthology", "anthropology"]

// Typo-tolerant search
const results = search.search("anthopric clode", {
  mode: 'fuzzy',     // Expand to similar terms
  fuzzyDistance: 2,  // Allow 2 character edits
  limit: 10
});
// → Documents containing "anthropic claude"

// Smart auto mode
const adaptive = hybrid.search(userInput, {
  mode: 'auto',      // Automatically choose best mode
  fuzzyDistance: 2,
  limit: 10
});
// Short query → prefix
// Long query → fuzzy
// Medium → exact
```

---

## Trade-offs Summary

### Edge N-Grams (Prefix Search)

| Aspect | Impact | Mitigation |
|--------|--------|------------|
| Index Size | ⚠️ +2-6x | Apply to title field only |
| Indexing Speed | ⚠️ -30% | Async indexing in workers |
| Query Speed | ✅ Same (O(1)) | No mitigation needed |
| Memory Usage | ⚠️ +2-3x | Selective fields, max length caps |
| Storage (IDB) | ⚠️ +2-3x | Compression, chunking |

### Fuzzy Matching (Edit Distance)

| Aspect | Impact | Mitigation |
|--------|--------|------------|
| Index Size | ✅ No change | N/A |
| Indexing Speed | ✅ No change | N/A |
| Query Speed | ⚠️ -50% for fuzzy | BK-Tree, length filtering, caching |
| Memory Usage | ⚠️ +1-2MB (vocab) | Acceptable for most cases |
| Storage (IDB) | ✅ No change | N/A |

### Recommended Configuration for Your Use Cases

**Links Panel / Navigation (tidigt)**
```typescript
// Small dataset (~1000 items), needs autocomplete
{
  enableEdgeNGrams: true,    // ✅ Index size OK for small data
  edgeNGramMinLength: 2,
  edgeNGramMaxLength: 15,
  enableStemming: false      // Keep exact matches
}
```

**Global Graph / Collection Items**
```typescript
// Medium dataset (~5000 items), occasional typos
{
  enableEdgeNGrams: true,    // ✅ Prefix for node names
  edgeNGramMinLength: 3,     // Reduce index size slightly
  edgeNGramMaxLength: 12,
  enableStemming: true       // Normalize variations
}
// Use fuzzy: 1 for query-time typo tolerance
```

**Large Document Collection**
```typescript
// Large dataset (>10k docs), full-text search
{
  enableEdgeNGrams: false,   // ❌ Too expensive for body text
  fieldConfig: {
    title: { enableEdgeNGrams: true },  // ✅ Only for titles
    body: { enableEdgeNGrams: false }   // Save space
  },
  enableStemming: true
}
// Use fuzzy: 2 for query-time typo tolerance
```

---

## Next Steps

1. ✅ Review this guide and the detailed plan (`docs/fuzzy-autocomplete-plan.md`)
2. ⚠️ Decide which features are must-have vs. nice-to-have
3. ⚠️ Prioritize implementation phases
4. ⚠️ Start with Phase 1 (Edge N-Grams) if you need it soon
5. ⚠️ Consider incremental rollout (in-memory first, then IndexedDB)
