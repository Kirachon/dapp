"use client";
import { ReactNode } from "react";
import { ApolloProvider } from "@apollo/client";
import { makeClient } from "@/lib/apollo";

export default function Providers({ children }: { children: ReactNode }) {
  const client = makeClient();
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

