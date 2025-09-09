"use client";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

// Prefer SuperTokens fetch to attach auth headers/cookies; fall back to native fetch
let stFetch: any = undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('supertokens-web-js/recipe/session');
  stFetch = (mod && (mod.fetch || mod.default?.fetch)) || undefined;
} catch {}

export const makeClient = () => {
  // Use backend API domain; cookies are set for API domain by SuperTokens
  const httpUri = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/graphql";

  // HTTP Link for queries and mutations with timeout
  const httpLink = new HttpLink({
    uri: httpUri,
    credentials: 'include',
    fetch: (uri, options) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const opts = { ...(options as any), signal: controller.signal } as RequestInit;
      if (!opts.credentials) opts.credentials = 'include';
      const f = stFetch || fetch;
      return (f as any)(uri as any, opts).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  });

  // Real-time features are handled exclusively by Socket.IO
  // GraphQL is used only for queries and mutations, not subscriptions

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache({
      // Optimize cache for better performance
      typePolicies: {
        Query: {
          fields: {
            me: {
              merge: true, // Merge user data instead of replacing
            },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
        fetchPolicy: 'cache-first', // Prefer cache for better performance
        notifyOnNetworkStatusChange: false, // Reduce re-renders
      },
      query: {
        errorPolicy: 'all',
        fetchPolicy: 'cache-first', // Prefer cache for better performance
      },
    },
    // Add connection timeout
    connectToDevTools: process.env.NODE_ENV === 'development',
  });
};

