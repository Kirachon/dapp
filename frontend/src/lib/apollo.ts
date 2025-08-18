"use client";
import { ApolloClient, InMemoryCache, HttpLink, split } from "@apollo/client";
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

export const makeClient = () => {
  const httpUri = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/graphql";
  const wsUri = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/graphql";

  // HTTP Link for queries and mutations
  const httpLink = new HttpLink({
    uri: httpUri,
    credentials: "include"
  });

  // WebSocket Link for subscriptions
  const wsLink = new GraphQLWsLink(
    createClient({
      url: wsUri,
      connectionParams: () => {
        // Add authentication if needed
        return {
          // authorization: `Bearer ${getAuthToken()}`,
        };
      },
      retryAttempts: 5,
      shouldRetry: () => true,
    })
  );

  // Split link to route operations to appropriate transport
  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    httpLink
  );

  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        errorPolicy: 'all',
      },
      query: {
        errorPolicy: 'all',
      },
    },
  });
};

