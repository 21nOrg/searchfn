/**
 * Levenshtein Distance Implementation
 * 
 * Computes the minimum edit distance between two strings.
 * Used for fuzzy matching to find similar terms.
 */

/**
 * Calculate Levenshtein distance between two strings
 * 
 * @param a First string
 * @param b Second string
 * @returns Minimum number of single-character edits (insertions, deletions, substitutions)
 */
export function levenshteinDistance(a: string, b: string): number {
  // Early exit for identical strings
  if (a === b) return 0;
  
  // Optimize for empty strings
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  // Create distance matrix
  const matrix: number[][] = [];
  
  // Initialize first row and column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        // Characters match, no edit needed
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // Take minimum of three operations
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

/**
 * Expand a term to include similar terms within max edit distance
 * 
 * @param term Query term to expand
 * @param maxDistance Maximum Levenshtein distance to accept
 * @param vocabulary Set of all indexed terms
 * @returns Array of similar terms (including original if present)
 */
export function fuzzyExpand(
  term: string,
  maxDistance: number,
  vocabulary: Set<string>
): string[] {
  const candidates: string[] = [];
  const termLower = term.toLowerCase();
  
  for (const vocabTerm of vocabulary) {
    // Pre-filter by length difference (optimization)
    const lengthDiff = Math.abs(vocabTerm.length - termLower.length);
    if (lengthDiff > maxDistance) {
      continue;
    }
    
    // Calculate edit distance
    const distance = levenshteinDistance(termLower, vocabTerm);
    if (distance <= maxDistance) {
      candidates.push(vocabTerm);
    }
  }
  
  return candidates;
}
