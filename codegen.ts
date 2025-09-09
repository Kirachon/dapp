import type { CodegenConfig } from '@graphql-codegen/cli';

// NOTE: Installing the required dev dependencies will be handled separately with explicit approval.
// This config scaffolds server + client type generation using extracted .graphql schema files.

const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/graphql/schema/**/*.graphql',
  documents: [
    // Frontend GraphQL operations (adjust as needed)
    'frontend/src/**/*.{ts,tsx,graphql,gql}',
  ],
  generates: {
    // Server-side resolver types
    'src/graphql/__generated__/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../types#GraphQLContext',
        avoidOptionals: true,
        useIndexSignature: true,
        skipDocumentsValidation: true,
      },
    },
    // Frontend client types & helpers
    'frontend/src/__generated__/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        avoidOptionals: true,
        dedupeFragments: true,
        skipDocumentsValidation: true,
      },
    },
  },
};

export default config;

