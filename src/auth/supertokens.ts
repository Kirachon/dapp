import supertokens from 'supertokens-node';
import Session from 'supertokens-node/recipe/session';
import EmailPassword from 'supertokens-node/recipe/emailpassword';
import EmailVerification from 'supertokens-node/recipe/emailverification';

const appInfo = {
  appName: 'DApp',
  apiDomain: process.env.API_DOMAIN || 'http://localhost:8080',
  websiteDomain: process.env.WEB_DOMAIN || 'http://localhost:3000',
  apiBasePath: '/auth',
};

export function initSuperTokens() {
  const connectionURI = process.env.SUPERTOKENS_CONNECTION_URI || 'http://supertokens:3567';
  console.log('SuperTokens connection URI:', connectionURI);
  supertokens.init({
    framework: 'fastify',
    debug: true,
    supertokens: {
      // Use local SuperTokens core for development
      connectionURI,
    },
    appInfo,
    recipeList: [
      EmailPassword.init({
        signUpFeature: {
          formFields: [
            {
              id: 'email',
              validate: async (value) => {
                if (typeof value !== 'string') {
                  return 'Email must be a string';
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                  return 'Please enter a valid email address';
                }
                return undefined;
              },
            },
            {
              id: 'password',
              validate: async (value) => {
                if (typeof value !== 'string') {
                  return 'Password must be a string';
                }
                if (value.length < 8) {
                  return 'Password must be at least 8 characters long';
                }
                if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
                  return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
                }
                return undefined;
              },
            },
          ],
        },
        resetPasswordUsingTokenFeature: {
          createAndSendCustomEmail: async (user, passwordResetURLWithToken) => {
            // In production, integrate with your email service (SendGrid, AWS SES, etc.)
            console.log(`Password reset email for ${user.email}: ${passwordResetURLWithToken}`);
          },
        },
      }),
      EmailVerification.init({
        mode: 'OPTIONAL', // Can be 'REQUIRED' for mandatory email verification
        emailDelivery: {
          override: (originalImplementation) => {
            return {
              ...originalImplementation,
              sendEmail: async function (input) {
                // In production, integrate with your email service
                console.log(`Email verification for ${input.user.email}: ${input.emailVerifyLink}`);
              },
            };
          },
        },
      }),
      Session.init({
        cookieSecure: process.env.NODE_ENV === 'production',
        cookieSameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        sessionExpiredStatusCode: 401,
        antiCsrf: 'VIA_TOKEN',
      }),
    ],
  });
}

export { Session, EmailPassword, EmailVerification };

