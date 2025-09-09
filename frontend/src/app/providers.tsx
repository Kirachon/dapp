"use client";
import { ReactNode, useEffect } from "react";
import { ApolloProvider } from "@apollo/client";
import { makeClient } from "@/lib/apollo";
// SuperTokens is initialised in lib/supertokens; no direct usage required here.
import { AuthProvider } from "@/contexts/AuthContext";
import { TourProvider } from "@/contexts/TourContext";

export default function Providers({ children }: { children: ReactNode }) {
  const client = makeClient();

  useEffect(() => {
    // Initialize SuperTokens on client side
    if (typeof window !== 'undefined') {
      // SuperTokens is already initialized in the lib file
    }
  }, []);

  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <TourProvider>
          {children}
        </TourProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}

