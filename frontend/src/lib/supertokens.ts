import SuperTokens from 'supertokens-auth-react';
import EmailPassword from 'supertokens-auth-react/recipe/emailpassword';
import Session from 'supertokens-auth-react/recipe/session';

export const frontendConfig = () => {
  return {
    appInfo: {
      appName: 'LoveConnect',
      apiDomain: process.env.NEXT_PUBLIC_API_DOMAIN || 'http://localhost:8080',
      websiteDomain: process.env.NEXT_PUBLIC_WEB_DOMAIN || 'http://localhost:3000',
      apiBasePath: '/auth',
      websiteBasePath: '/auth',
    },
    recipeList: [
      EmailPassword.init({
        signInAndUpFeature: {
          disableDefaultUI: true, // We'll use custom UI
        },
        resetPasswordUsingTokenFeature: {
          disableDefaultUI: true,
        },
      }),
      Session.init({
        tokenTransferMethod: 'cookie',
      }),
    ],
  };
};

// Initialize SuperTokens
if (typeof window !== 'undefined') {
  SuperTokens.init(frontendConfig());
}

export { SuperTokens, EmailPassword, Session };
