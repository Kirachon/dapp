import fs from 'fs';

// Guardrail: ensure we don't reintroduce prisma.$queryRawUnsafe in critical server file
it('does not use prisma.$queryRawUnsafe in src/index.ts', () => {
  const content = fs.readFileSync(require.resolve('../src/index.ts'), 'utf8');
  expect(content).not.toMatch(/\$queryRawUnsafe\(/);
});
