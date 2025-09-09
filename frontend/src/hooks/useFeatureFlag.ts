import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_FEATURE_FLAG = gql`
  query GetFeatureFlag($key: String!) {
    featureFlag(key: $key) {
      key
      enabled
      targetAudience
      rolloutPercentage
    }
  }
`;

const GET_ALL_FEATURE_FLAGS = gql`
  query GetAllFeatureFlags {
    featureFlags {
      key
      enabled
      targetAudience
      rolloutPercentage
    }
  }
`;

export function useFeatureFlag(key: string) {
  const { data, loading, error } = useQuery(GET_FEATURE_FLAG, {
    variables: { key },
    errorPolicy: 'ignore' // Don't throw errors for missing flags
  });

  const isEnabled = data?.featureFlag?.enabled || false;
  
  return {
    isEnabled,
    loading,
    error,
    flag: data?.featureFlag
  };
}

export function useFeatureFlags() {
  const { data, loading, error } = useQuery(GET_ALL_FEATURE_FLAGS, {
    errorPolicy: 'ignore'
  });

  const flags = data?.featureFlags || [];
  
  // Create a map for easy access
  const flagMap = flags.reduce((acc: Record<string, boolean>, flag: any) => {
    acc[flag.key] = flag.enabled;
    return acc;
  }, {});

  const isEnabled = (key: string) => flagMap[key] || false;
  
  return {
    flags,
    flagMap,
    isEnabled,
    loading,
    error
  };
}

// Helper hook for checking multiple flags at once
export function useFeatureFlagCheck(keys: string[]) {
  const { flagMap, loading, error } = useFeatureFlags();
  
  const results = keys.reduce((acc: Record<string, boolean>, key) => {
    acc[key] = flagMap[key] || false;
    return acc;
  }, {});
  
  return {
    results,
    loading,
    error,
    isEnabled: (key: string) => results[key] || false
  };
}
