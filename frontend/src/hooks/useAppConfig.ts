import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_APP_CONFIG = gql`
  query GetAppConfig($key: String!) {
    appConfig(key: $key)
  }
`;

const GET_PUBLIC_APP_CONFIGS = gql`
  query GetPublicAppConfigs {
    appConfigs(publicOnly: true) {
      key
      value
      category
    }
  }
`;

export function useAppConfig(key: string) {
  const { data, loading, error } = useQuery(GET_APP_CONFIG, {
    variables: { key },
    errorPolicy: 'ignore'
  });

  let value = null;
  try {
    value = data?.appConfig ? JSON.parse(data.appConfig) : null;
  } catch {
    value = data?.appConfig; // Keep as string if not valid JSON
  }
  
  return {
    value,
    loading,
    error
  };
}

export function usePublicAppConfigs() {
  const { data, loading, error } = useQuery(GET_PUBLIC_APP_CONFIGS, {
    errorPolicy: 'ignore'
  });

  const configs = data?.appConfigs || [];
  
  // Create a map for easy access
  const configMap = configs.reduce((acc: Record<string, any>, config: any) => {
    try {
      acc[config.key] = JSON.parse(config.value);
    } catch {
      acc[config.key] = config.value;
    }
    return acc;
  }, {});

  const getValue = (key: string, defaultValue?: any) => {
    return configMap[key] !== undefined ? configMap[key] : defaultValue;
  };
  
  return {
    configs,
    configMap,
    getValue,
    loading,
    error
  };
}

// Specific config hooks for commonly used values
export function useAppName() {
  const { value, loading, error } = useAppConfig('app_name');
  return {
    appName: value || 'LoveConnect',
    loading,
    error
  };
}

export function useAppTagline() {
  const { value, loading, error } = useAppConfig('app_tagline');
  return {
    tagline: value || 'Find Your Perfect Match',
    loading,
    error
  };
}

export function useMaxPhotos() {
  const { value, loading, error } = useAppConfig('max_photos_per_user');
  return {
    maxPhotos: value || 9,
    loading,
    error
  };
}

export function useDailySwipeLimit() {
  const { value, loading, error } = useAppConfig('max_daily_swipes');
  return {
    dailyLimit: value || 50,
    loading,
    error
  };
}

export function useSupportEmail() {
  const { value, loading, error } = useAppConfig('support_email');
  return {
    supportEmail: value || 'support@loveconnect.app',
    loading,
    error
  };
}
