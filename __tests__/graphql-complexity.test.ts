import {
  calculateQueryComplexity,
  isQueryOverComplex,
  DEFAULT_MAX_COMPLEXITY,
} from '../src/lib/graphql/complexity';

describe('GraphQL Query Complexity', () => {
  it('returns low complexity for simple query', () => {
    const q = `query { health }`;
    const c = calculateQueryComplexity(q);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(20);
  });

  it('detects over-complex queries', () => {
    // Generate a large field selection to exceed the threshold heuristically
    const repeated = Array.from({ length: 80 })
      .map((_, i) => `f${i}: messages(conversationId:"1", page:1, pageSize:100){ id content }`)
      .join(' ');
    const q = `query Big { me{ id email } ${repeated} }`;
    const { over, complexity, threshold } = isQueryOverComplex(q, 100);
    expect(complexity).toBeGreaterThan(100);
    expect(over).toBe(true);
    expect(threshold).toBe(100);
  });

  it('uses DEFAULT_MAX_COMPLEXITY when threshold not provided', () => {
    const q = `query { ${'field{ sub { x } } '.repeat(50)} }`;
    const { over } = isQueryOverComplex(q);
    // Cannot assert exact number, but should exceed default
    expect(typeof DEFAULT_MAX_COMPLEXITY).toBe('number');
    expect(over).toBe(true);
  });
});
