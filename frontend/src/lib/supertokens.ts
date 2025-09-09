import SuperTokens from 'supertokens-auth-react';
import EmailPassword from 'supertokens-auth-react/recipe/emailpassword';
import Session from 'supertokens-auth-react/recipe/session';

export const frontendConfig = () => {
  const computedWebsiteDomain =
    process.env.NEXT_PUBLIC_WEB_DOMAIN ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
  const computedApiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || 'http://localhost:8080';

  if (typeof window !== 'undefined') {
    // Helpful during dev/tests to ensure domains are correct
    console.log('🔧 SuperTokens domains', {
      websiteDomain: computedWebsiteDomain,
      apiDomain: computedApiDomain,
    });
  }

  return {
    appInfo: {
      appName: 'LoveConnect',
      apiDomain: computedApiDomain,
      websiteDomain: computedWebsiteDomain,
      apiBasePath: '/auth',
      websiteBasePath: '/auth',
    },
    recipeList: [
      EmailPassword.init({}),
      Session.init({
        // Align with backend v23: tokens are sent via headers, not cookies
        tokenTransferMethod: 'header',
      }),
    ],
  };
};

// Initialize SuperTokens
if (typeof window !== 'undefined') {
  SuperTokens.init(frontendConfig());
}

export { SuperTokens, EmailPassword, Session };
