export const DEFAULT_MAX_COMPLEXITY = Number(process.env.GRAPHQL_MAX_COMPLEXITY || 300);

export function calculateQueryComplexity(query: string | undefined | null): number {
  if (!query) return 0;

  let complexity = 0;

  // Count nested selections (each level adds complexity)
  const braceDepth = (query.match(/{/g) || []).length;
  complexity += braceDepth * 2;

  // Count field selections heuristically (identifiers followed by ( or {)
  const fieldCount = (query.match(/\w+\s*[({]/g) || []).length;
  complexity += fieldCount;

  // Penalize expensive operations by name
  if (query.includes('adminModeration')) complexity += 10;
  if (query.includes('users')) complexity += 5;
  if (query.includes('messages')) complexity += 5;
  if (query.includes('bulk')) complexity += 15;

  // Penalize large pagination limits
  if (query.includes('first:') || query.includes('last:')) {
    const limitMatch = query.match(/(?:first|last):\s*(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : 100;
    if (limit > 50) complexity += Math.floor(limit / 10);
  }

  return complexity;
}

export function isQueryOverComplex(
  query: string | undefined | null,
  threshold = DEFAULT_MAX_COMPLEXITY,
) {
  const complexity = calculateQueryComplexity(query);
  return { over: complexity > threshold, complexity, threshold };
}
