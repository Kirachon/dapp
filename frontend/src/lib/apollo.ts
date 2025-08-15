"use client";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

export const makeClient = () => {
  const uri = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/graphql";
  return new ApolloClient({
    link: new HttpLink({ uri, credentials: "include" }),
    cache: new InMemoryCache(),
  });
};

