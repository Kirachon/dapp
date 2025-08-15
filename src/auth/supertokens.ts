import supertokens from 'supertokens-node';
import Session from 'supertokens-node/recipe/session';
import EmailPassword from 'supertokens-node/recipe/emailpassword';

const appInfo = {
  appName: 'DApp',
  apiDomain: process.env.API_DOMAIN || 'http://localhost:8080',
  websiteDomain: process.env.WEB_DOMAIN || 'http://localhost:3000',
  apiBasePath: '/auth',
};

export function initSuperTokens() {
  supertokens.init({
    framework: 'fastify',
    debug: true,
    supertokens: {
      // Using SuperTokens managed SaaS; for self-hosted core set connectionURI
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || 'https://try.supertokens.io',
      apiKey: process.env.SUPERTOKENS_API_KEY,
    },
    appInfo,
    recipeList: [
      EmailPassword.init({}),
      Session.init({}),
    ],
  });
}

export { Session, EmailPassword };

