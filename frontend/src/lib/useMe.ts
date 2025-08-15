"use client";
import { gql, useQuery } from "@apollo/client";

export const ME = gql`query { me { id email } }`;

export function useMe() {
  const { data, loading, error, refetch } = useQuery(ME);
  return { me: data?.me ?? null, loading, error, refetch };
}

