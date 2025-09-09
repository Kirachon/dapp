This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Authentication (SuperTokens) Integration

This app uses SuperTokens with header-based token transfer aligned with supertokens-node v23.x.

- Backend API base: http://localhost:8080, apiBasePath: `/auth`
- No Session "handshake" GET endpoint is used or required in v23.
- Frontend uses `supertokens-auth-react` for Email/Password UI and `supertokens-web-js` fetch interceptors for GraphQL requests.
- Token transfer: `header` (not cookies). CORS exposes required SuperTokens headers.

Key files:
- `src/lib/supertokens.ts`: Session.init configured with `tokenTransferMethod: 'header'`
- `src/lib/apollo.ts`: Apollo HttpLink uses fetch wrapped by `supertokens-web-js` interceptors
- `src/contexts/AuthContext.tsx`: No axios interceptors; session state is derived via `Session.doesSessionExist()` and GraphQL `me`


### Preferred data fetching pattern (GraphQL + SuperTokens)

ActivationDashboard uses a GraphQL query to fetch activation metrics for the current user.

Query:
```graphql
query ActivationData {
  activationData {
    activationScore
    activationFactors
    engagementMetrics { loginFrequency featureUsage timeSpent goalsSet goalsCompleted }
    milestones { firstLogin profileCompleted firstGoalSet weeklyActive }
    preferences { welcomeEmails inAppMessages achievementNotifications }
  }
}
```

See `src/components/features/activation/ActivationDashboard.tsx` for usage with Apollo `useQuery`.

Session handling in the UI relies on SuperTokens via `AuthContext`, not NextAuth sessions.

To run E2E auth tests:

```
# Terminal A (API)
npm run dev   # from repo root -> starts API at :8080

# Terminal B (Frontend)
cd frontend && npm run dev   # starts Next at :3000

# Terminal C (E2E)
cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e:auth -- --headed
```
