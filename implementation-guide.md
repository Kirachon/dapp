# User Onboarding Platform Implementation Guide

## Project Setup

### 1. Initialize Next.js 14 Project
```bash
npx create-next-app@latest user-onboarding-platform --typescript --tailwind --eslint --app --src-dir
cd user-onboarding-platform
```

### 2. Install Dependencies
```bash
# Core dependencies (backend + frontend)
npm install @prisma/client prisma
# GraphQL
npm install @apollo/client graphql
# SuperTokens (frontend)
npm install supertokens-auth-react supertokens-web-js
# SuperTokens (backend)
npm install supertokens-node
# Forms & validation
npm install @hookform/resolvers react-hook-form zod
# Email & misc
npm install @sendgrid/mail
npm install sharp
npm install redis @upstash/redis

# Development dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
npm install -D eslint-config-next
```

### 3. Environment Variables (.env.local)
```env
# API base
WEB_BASE_URL="http://localhost:3000"
API_BASE_URL="http://localhost:8080"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/onboarding_platform"

# SuperTokens (backend)
SUPERTOKENS_CONNECTION_URI="http://localhost:3567"
SUPERTOKENS_API_KEY="supertokens-dev-key"
# SuperTokens (frontend)
NEXT_PUBLIC_SUPERTOKENS_CONNECTION_URI="http://localhost:3567"
NEXT_PUBLIC_API_BASE_URL="http://localhost:8080"

# SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="noreply@yourplatform.com"

# Redis
REDIS_URL="redis://localhost:6379"

# File Upload
UPLOAD_STORAGE_URL="your-cloud-storage-url"
```

> Deprecation notice: All Next.js API routes under `src/app/api/**` are being replaced by GraphQL. These endpoints now return HTTP 410 Gone.
> Use GraphQL queries/mutations at the API server (e.g., http://localhost:8080/graphql) with SuperTokens session headers.


### Authentication Flow (SuperTokens + GraphQL)
- Frontend: Initialize SuperTokens (supertokens-auth-react) and Apollo Client; send session tokens via headers.
- Backend: SuperTokens middleware validates sessions; GraphQL context includes ctx.user when authenticated.

Example: Fetch current user
```graphql
query Me { me { id email roles profile { id name isAdmin } } }
```

Example: Activation data (used by ActivationDashboard)
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


## Epic 1: Foundation & Authentication Infrastructure

### Story 1.1: User Registration Implementation

#### Database Schema (prisma/schema.prisma)
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  profile Profile?
  accounts Account[]
  sessions Session[]
  verificationTokens VerificationToken[]

  @@map("users")
}

model Profile {
  id                   String  @id @default(cuid())
  userId               String  @unique
  firstName            String?
  lastName             String?
  avatar               String?
  bio                  String?
  preferences          Json    @default("{}")
  onboardingCompleted  Boolean @default(false)
  onboardingStep       Int     @default(0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  id         String   @id @default(cuid())
  identifier String
  token      String   @unique
  expires    DateTime
  userId     String?
  user       User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

#### Registration GraphQL Mutation (API server)
```graphql
mutation SignUp($email: String!, $password: String!, $acceptTerms: Boolean!) {
  signUp(email: $email, password: $password, acceptTerms: $acceptTerms) {
    ok
    error
  }
}
```

#### Registration Form Component (src/components/forms/RegistrationForm.tsx)
```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/toast';
import { useMutation, gql } from '@apollo/client';

const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const SIGN_UP = gql`
  mutation SignUp($email: String!, $password: String!, $acceptTerms: Boolean!) {
    signUp(email: $email, password: $password, acceptTerms: $acceptTerms) {
      ok
      error
    }
  }
`;

type RegistrationFormData = z.infer<typeof registrationSchema>;

export function RegistrationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [signUp] = useMutation(SIGN_UP);
  const { register, handleSubmit, formState: { errors }, setError } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    try {
      const res = await signUp({ variables: { email: data.email, password: data.password, acceptTerms: data.acceptTerms } });
      const result = res.data?.signUp;
      if (result?.ok) {
        toast.success('Account created successfully!');
      } else {
        if (result?.error === 'EMAIL_EXISTS') setError('email', { message: 'Account with this email already exists' });
        else toast.error(result?.error || 'Sign up failed');
      }
    } catch (e) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (/* same JSX as before */);
}
```

#### Registration Form Component (src/components/forms/RegistrationForm.tsx)
```typescript
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/toast';

const registrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  onSuccess?: (data: { user: { id: string; email: string } }) => void;
}

export function RegistrationForm({ onSuccess }: RegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Account created successfully!');
        onSuccess?.(result.data);
      } else {
        if (result.error.code === 'EMAIL_EXISTS') {
          setError('email', { message: result.error.message });
        } else {
          toast.error(result.error.message);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Input
          {...register('email')}
          type="email"
          placeholder="Email address"
          error={errors.email?.message}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Input
          {...register('password')}
          type="password"
          placeholder="Password"
          error={errors.password?.message}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <Input
          {...register('confirmPassword')}
          type="password"
          placeholder="Confirm password"
          error={errors.confirmPassword?.message}
          aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="flex items-center">
        <input
          {...register('acceptTerms')}
          type="checkbox"
          id="acceptTerms"
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-900">
          I accept the{' '}
          <a href="/terms" className="text-blue-600 hover:text-blue-500">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-blue-600 hover:text-blue-500">
            Privacy Policy
          </a>
        </label>
      </div>
      {errors.acceptTerms && (
        <p className="text-sm text-red-600" role="alert">
          {errors.acceptTerms.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
        aria-describedby={isLoading ? 'loading-text' : undefined}
      >
        {isLoading ? (
          <>
            <span className="sr-only" id="loading-text">Creating account...</span>
            Creating Account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>
    </form>
  );
}
```

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Set up the project structure as shown above
2. Configure database with Prisma
3. Implement basic authentication (Stories 1.1-1.3)
4. Set up testing framework

### Phase 2: Profile Management
1. Implement profile creation (Story 2.1)
2. Add avatar upload system (Story 2.2)
3. Build settings management (Story 2.3)

### Phase 3: Onboarding Experience
1. Create guided tour system (Story 3.1)
2. Implement progress tracking (Story 3.2)
3. Build welcome sequences (Story 3.3)

## Next Steps

1. **Initialize the project** using the setup commands above
2. **Implement Epic 1** following the code samples provided
3. **Create comprehensive tests** for each feature
4. **Build Epic 2** using similar patterns
5. **Complete Epic 3** with onboarding features

Would you like me to:
1. **Generate specific components** for particular stories?
2. **Create detailed API implementations** for specific endpoints?
3. **Provide testing examples** for the implemented features?
4. **Generate utility functions** and configuration files?

This approach allows for systematic implementation while maintaining code quality and following the comprehensive specifications from our BMAD workflow.
