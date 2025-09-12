export const DEFAULT_MAX_DEPTH = 10;

// Simple heuristic depth calculator for GraphQL query strings.
// Defensive check to complement complexity analysis; not a full AST parser.
export function calculateQueryDepth(queryText?: string): number {
  if (!queryText || typeof queryText !== 'string') return 0;
  // Remove string literals to avoid counting braces inside them
  const stripped = queryText.replace(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g, '');
  // Remove comments
  const noComments = stripped.replace(/#.*/g, '');
  let depth = 0;
  let maxDepth = 0;
  let inParens = 0;
  for (let i = 0; i < noComments.length; i++) {
    const ch = noComments[i];
    if (ch === '(') inParens++;
    if (ch === ')') inParens = Math.max(0, inParens - 1);
    if (inParens > 0) continue; // ignore arguments/variables
    if (ch === '{') {
      depth++;
      if (depth > maxDepth) maxDepth = depth;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
    }
  }
  return maxDepth;
}
