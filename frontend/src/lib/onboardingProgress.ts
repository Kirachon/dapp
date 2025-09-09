"use client";

import { gql } from "@apollo/client";
import { makeClient } from "@/lib/apollo";

const client = makeClient();

const GET_PROFILE = gql`query { myProfile { name lifestyle } }`;
const UPSERT_PROFILE = gql`
  mutation UpsertLifestyle($input: ProfileInput!) { upsertMyProfile(input: $input) { userId lifestyle } }
`;

export async function markOnboardingStep(step: string) {
  try {
    const { data } = await client.query({ query: GET_PROFILE, fetchPolicy: 'network-only', context: { fetchOptions: { credentials: 'include' } } });
    let lifestyle: any = {};
    try { lifestyle = data?.myProfile?.lifestyle ? JSON.parse(data.myProfile.lifestyle) : {}; } catch {}
    const steps = lifestyle?.onboarding?.steps || {};
    steps[step] = { completed: true, at: new Date().toISOString() };
    const merged = { ...lifestyle, onboarding: { ...(lifestyle.onboarding || {}), steps } };
    await client.mutate({ mutation: UPSERT_PROFILE, variables: { input: { name: data?.myProfile?.name || '', age: 18, photos: [], visibility: 'PUBLIC', lifestyle: JSON.stringify(merged) } }, context: { fetchOptions: { credentials: 'include' } } });
  } catch (e) {
    // best-effort; non-fatal
    console.warn('Failed to mark onboarding step', step, e);
  }
}

