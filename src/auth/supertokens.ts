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
  const connectionURI = process.env.SUPERTOKENS_CONNECTION_URI || 'http://localhost:3567';
  const resolvedApiKey = process.env.SUPERTOKENS_API_KEY || 'supertokens-dev-api-key-12345678901234567890';
  const masked = resolvedApiKey ? `${resolvedApiKey.slice(0, 4)}...${resolvedApiKey.slice(-4)}` : 'NONE';
  console.log('SuperTokens connection URI:', connectionURI);
  console.log('SuperTokens API key (masked):', masked);

  try {
    supertokens.init({
      framework: 'fastify',
      debug: true,
      supertokens: {
        // Use local SuperTokens core for development
        connectionURI,
        apiKey: resolvedApiKey,
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
        override: {
          apis: (original) => ({
            ...original,
            signUpPOST: async (input) => {
              const resp = await original.signUpPOST!(input);
              try {
                if (resp.status === 'OK') {
                  // Upsert Prisma user on any emailpassword signup (REST or programmatic)
                  const { PrismaClient } = await import('@prisma/client');
                  const prisma = new PrismaClient();
                  try {
                    await prisma.user.upsert({
                      where: { id: resp.user.id },
                      update: { email: resp.user.emails[0] || '' },
                      create: { id: resp.user.id, email: resp.user.emails[0] || '', passwordHash: '' },
                    });
                  } finally {
                    await prisma.$disconnect();
                  }
                }
              } catch (e) {
                console.error('Prisma upsert on signUpPOST failed:', e);
              }
              return resp;
            }
          })
        }
      }),
      EmailVerification.init({
        mode: process.env.NODE_ENV === 'production' ? 'REQUIRED' : 'OPTIONAL',
        emailDelivery: {
          override: (originalImplementation) => {
            return {
              ...originalImplementation,
              sendEmail: async function (input) {
                try {
                  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
                  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'no-reply@localhost';
                  const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'LoveConnect';
                  const verifyLink = input.emailVerifyLink;
                  if (!SENDGRID_API_KEY) {
                    console.warn('⚠️ SENDGRID_API_KEY not set; cannot send verification email. Link:', verifyLink);
                    return;
                  }
                  const payload = {
                    personalizations: [{ to: [{ email: input.user.email }] }],
                    from: { email: FROM_EMAIL, name: FROM_NAME },
                    subject: 'Verify your email address',
                    content: [{ type: 'text/html', value: `<p>Please verify your email by clicking <a href="${verifyLink}">this link</a>.</p>` }],
                  } as any;
                  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) {
                    console.error('❌ SendGrid send failed', res.status, await res.text());
                  } else {
                    console.log('📧 Verification email sent via SendGrid to', input.user.email);
                  }
                } catch (e) {
                  console.error('❌ Error sending verification email', e);
                }
              },
            };
          },
        },
      }),
      Session.init({
        // Align with frontend: use cookies for token transfer in dev and prod
        tokenTransferMethod: 'cookie',
        cookieSecure: process.env.NODE_ENV === 'production',
        // In development, use SameSite=Lax so Chromium accepts non-secure cookies on localhost.
        // Ports differ but are same-site on localhost, so Lax is sufficient for API requests with credentials: 'include'.
        cookieSameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        sessionExpiredStatusCode: 401,
        antiCsrf: process.env.NODE_ENV === 'production' ? 'VIA_TOKEN' : 'NONE',
      }),
    ],
  });

  console.log("✅ SuperTokens initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize SuperTokens:", error);
    console.log("🔄 Continuing without SuperTokens - auth endpoints will return mock responses");
  }
}

export { Session, EmailPassword, EmailVerification };

