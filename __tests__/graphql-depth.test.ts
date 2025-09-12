import { calculateQueryDepth } from '../src/lib/graphql/depth';

describe('GraphQL depth calculator', () => {
  it('returns 0 for empty/undefined', () => {
    expect(calculateQueryDepth(undefined)).toBe(0);
    expect(calculateQueryDepth('')).toBe(0);
  });

  it('calculates shallow query depth', () => {
    const q = `query { me { id email } }`;
    expect(calculateQueryDepth(q)).toBe(2);
  });

  it('calculates deeper nested depth', () => {
    const q = `query {
      me { profile { photos { url } } }
    }`;
    expect(calculateQueryDepth(q)).toBeGreaterThanOrEqual(4);
  });

  it('ignores braces in strings and arguments', () => {
    const q = `query Test($x: String) { node(id: "{notbrace}") { id } }`;
    expect(calculateQueryDepth(q)).toBe(2);
  });
});
