/**
 * Proof of Concept: Fuzzy Matching and Autocomplete
 * 
 * This demonstrates how edge n-grams and fuzzy matching would work
 * with the current architecture before full implementation.
 */

// Mock types to demonstrate the concept
type Token = { value: string; position: number };

// ============================================
// PART 1: Edge N-Grams for Prefix Search
// ============================================

/**
 * Generate edge n-grams (prefixes) for a term
 * Example: "anthropic" with min=2, max=15 produces:
 * ["an", "ant", "anth", "anthr", "anthro", "anthrop", "anthropi", "anthropic"]
 */
function generateEdgeNGrams(term: string, minLength = 2, maxLength = 15): string[] {
  const ngrams: string[] = [];
  const effectiveMax = Math.min(term.length, maxLength);
  
  if (term.length < minLength) {
    return [term]; // Too short, return as-is
  }
  
  for (let i = minLength; i <= effectiveMax; i++) {
    ngrams.push(term.substring(0, i));
  }
  
  return ngrams;
}

// Demo
console.log("=== Edge N-Grams Demo ===");
console.log("anthropic:", generateEdgeNGrams("anthropic"));
console.log("claude:", generateEdgeNGrams("claude"));
console.log("api:", generateEdgeNGrams("api", 2, 15));
console.log();

// ============================================
// PART 2: Index Building with N-Grams
// ============================================

interface SimpleIndex {
  [term: string]: Set<string>; // term -> document IDs
}

/**
 * Build index with edge n-grams
 */
function buildIndexWithNGrams(documents: Array<{ id: string; text: string }>): SimpleIndex {
  const index: SimpleIndex = {};
  
  for (const doc of documents) {
    // Tokenize (simple split for demo)
    const tokens = doc.text.toLowerCase().split(/\s+/);
    
    for (const token of tokens) {
      // Generate n-grams for each token
      const ngrams = generateEdgeNGrams(token, 2, 15);
      
      for (const ngram of ngrams) {
        if (!index[ngram]) {
          index[ngram] = new Set();
        }
        index[ngram].add(doc.id);
      }
    }
  }
  
  return index;
}

// Demo data
const testDocs = [
  { id: "doc1", text: "Anthropic Claude AI assistant" },
  { id: "doc2", text: "OpenAI ChatGPT language model" },
  { id: "doc3", text: "Google Gemini artificial intelligence" },
  { id: "doc4", text: "Anthropology studies human behavior" }
];

console.log("=== Building Index with N-Grams ===");
const ngramIndex = buildIndexWithNGrams(testDocs);
console.log("Index keys (sample):", Object.keys(ngramIndex).slice(0, 20));
console.log("Total terms indexed:", Object.keys(ngramIndex).length);
console.log();

// ============================================
// PART 3: Prefix Search
// ============================================

function prefixSearch(index: SimpleIndex, query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const matchedDocs = index[normalizedQuery];
  return matchedDocs ? Array.from(matchedDocs) : [];
}

console.log("=== Prefix Search Demo ===");
console.log('Search "an":', prefixSearch(ngramIndex, "an"));
console.log('Search "anth":', prefixSearch(ngramIndex, "anth"));
console.log('Search "anthro":', prefixSearch(ngramIndex, "anthro"));
console.log('Search "clau":', prefixSearch(ngramIndex, "clau"));
console.log('Search "claude":', prefixSearch(ngramIndex, "claude"));
console.log();

// ============================================
// PART 4: Fuzzy Matching with Levenshtein
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
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

console.log("=== Levenshtein Distance Demo ===");
console.log('Distance("anthropic", "anthropic"):', levenshteinDistance("anthropic", "anthropic"));
console.log('Distance("anthropic", "anthopric"):', levenshteinDistance("anthropic", "anthopric"));
console.log('Distance("anthropic", "antropic"):', levenshteinDistance("anthropic", "antropic"));
console.log('Distance("claude", "claued"):', levenshteinDistance("claude", "claued"));
console.log('Distance("claude", "clod"):', levenshteinDistance("claude", "clod"));
console.log();

/**
 * Find all terms within edit distance
 */
function fuzzyExpand(term: string, vocabulary: Set<string>, maxDistance: number): string[] {
  const candidates: string[] = [];
  
  for (const vocabTerm of vocabulary) {
    // Quick filter: if length difference > maxDistance, skip
    if (Math.abs(vocabTerm.length - term.length) > maxDistance) {
      continue;
    }
    
    const distance = levenshteinDistance(term, vocabTerm);
    if (distance <= maxDistance) {
      candidates.push(vocabTerm);
    }
  }
  
  return candidates;
}

// Build vocabulary from index
const vocabulary = new Set(Object.keys(ngramIndex));
console.log("Vocabulary size:", vocabulary.size);
console.log();

console.log("=== Fuzzy Expansion Demo ===");
console.log('Expand "anthopric" (distance=2):', fuzzyExpand("anthopric", vocabulary, 2));
console.log('Expand "antropic" (distance=1):', fuzzyExpand("antropic", vocabulary, 1));
console.log('Expand "claued" (distance=2):', fuzzyExpand("claued", vocabulary, 2));
console.log();

// ============================================
// PART 5: Combined Search Strategy
// ============================================

interface SearchOptions {
  mode?: 'exact' | 'prefix' | 'fuzzy' | 'auto';
  fuzzyDistance?: number;
}

function smartSearch(
  index: SimpleIndex,
  vocabulary: Set<string>,
  query: string,
  options: SearchOptions = {}
): { mode: string; results: string[] } {
  const normalizedQuery = query.toLowerCase();
  const mode = options.mode || 'auto';
  const fuzzyDistance = options.fuzzyDistance || 2;
  
  // Auto-detect mode
  let effectiveMode = mode;
  if (mode === 'auto') {
    if (normalizedQuery.length <= 3) {
      effectiveMode = 'prefix';
    } else if (normalizedQuery.length >= 8) {
      effectiveMode = 'fuzzy';
    } else {
      effectiveMode = 'exact';
    }
  }
  
  let results: Set<string> = new Set();
  
  switch (effectiveMode) {
    case 'prefix':
      // Use n-gram index directly
      const prefixMatches = index[normalizedQuery];
      if (prefixMatches) {
        results = new Set(prefixMatches);
      }
      break;
      
    case 'fuzzy':
      // Expand query to similar terms
      const expansions = fuzzyExpand(normalizedQuery, vocabulary, fuzzyDistance);
      for (const expansion of expansions) {
        const matches = index[expansion];
        if (matches) {
          matches.forEach(doc => results.add(doc));
        }
      }
      break;
      
    case 'exact':
    default:
      // Regular exact match
      const exactMatches = index[normalizedQuery];
      if (exactMatches) {
        results = new Set(exactMatches);
      }
      break;
  }
  
  return {
    mode: effectiveMode,
    results: Array.from(results)
  };
}

console.log("=== Smart Search Demo ===");
console.log('Search "an" (auto):', smartSearch(ngramIndex, vocabulary, "an"));
console.log('Search "anth" (auto):', smartSearch(ngramIndex, vocabulary, "anth"));
console.log('Search "anthropic" (auto):', smartSearch(ngramIndex, vocabulary, "anthropic"));
console.log('Search "anthopric" (auto):', smartSearch(ngramIndex, vocabulary, "anthopric"));
console.log('Search "ai" (auto):', smartSearch(ngramIndex, vocabulary, "ai"));
console.log();

// ============================================
// PART 6: Performance Analysis
// ============================================

console.log("=== Performance & Trade-offs ===");

// Calculate index size increase
const originalTerms = new Set<string>();
for (const doc of testDocs) {
  const tokens = doc.text.toLowerCase().split(/\s+/);
  tokens.forEach(t => originalTerms.add(t));
}

const indexSizeIncrease = (Object.keys(ngramIndex).length / originalTerms.size).toFixed(2);
console.log("Original unique terms:", originalTerms.size);
console.log("Terms with n-grams:", Object.keys(ngramIndex).length);
console.log("Index size increase:", `${indexSizeIncrease}x`);
console.log();

// Fuzzy search complexity
console.log("Fuzzy search considerations:");
console.log("- Vocabulary size:", vocabulary.size);
console.log("- Avg comparisons per query:", Math.floor(vocabulary.size * 0.3), "(with length filtering)");
console.log("- With BK-Tree:", Math.floor(Math.log2(vocabulary.size) * 10), "(estimated)");
console.log();

// ============================================
// PART 7: Recommendations
// ============================================

console.log("=== Implementation Recommendations ===");
console.log(`
1. EDGE N-GRAMS FOR PREFIX SEARCH
   ✓ Solves: "an" → "anthropic"
   ✓ Index size: ${indexSizeIncrease}x (${Object.keys(ngramIndex).length} vs ${originalTerms.size} terms)
   ✓ Query speed: Fast (direct lookup)
   ✓ Best for: Autocomplete, partial matching
   ⚠ Trade-off: Larger index size

2. LEVENSHTEIN FOR FUZZY MATCHING
   ✓ Solves: "anthopric" → "anthropic"
   ✓ Index size: No change
   ✓ Query speed: Slower (checks multiple terms)
   ✓ Best for: Typo tolerance
   ⚠ Trade-off: Query performance hit

3. HYBRID STRATEGY
   ✓ Short queries (≤3 chars): Use prefix (n-grams)
   ✓ Long queries (≥8 chars): Use fuzzy (edit distance)
   ✓ Medium queries: Exact match
   ✓ Best for: General-purpose search
   
4. OPTIMIZATION PATHS
   - BK-Tree for vocabularies > 50k terms
   - Selective n-grams (title only, not body)
   - Cache fuzzy expansions
   - Length-based pre-filtering
`);

// ============================================
// Example Usage in Real Implementation
// ============================================

console.log("=== Example API Usage ===");
console.log(`
// Autocomplete mode (prefix search)
const results = await searchFn.search("anth", {
  mode: 'prefix',
  limit: 5
});

// Typo-tolerant mode (fuzzy search)
const results = await searchFn.search("anthopric", {
  mode: 'fuzzy',
  fuzzyDistance: 2,
  limit: 10
});

// Auto mode (smart detection)
const results = await searchFn.search(userInput, {
  mode: 'auto',
  limit: 10
});

// Configuration
const searchFn = new SearchFn({
  name: "my-index",
  fields: ["title", "body"],
  pipeline: {
    enableEdgeNGrams: true,
    edgeNGramMinLength: 2,
    edgeNGramMaxLength: 15,
    enableStemming: true
  }
});
`);
