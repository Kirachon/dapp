# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (API)
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to dist/
- `npm start` - Run compiled production build
- `npm run lint` - ESLint with TypeScript support
- `npm run type-check` - TypeScript type checking without emit
- `npm test` - Run Jest tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI

### Frontend
- `cd frontend && npm run dev` - Start Next.js development server
- `cd frontend && npm run build` - Build production frontend
- `cd frontend && npm run lint` - Next.js ESLint
- `cd frontend && npm test` - Run Playwright E2E tests
- `cd frontend && npm run test:headed` - Run E2E tests with browser UI
- `cd frontend && npm run test:e2e` - Custom E2E test runner
- `cd frontend && npm run test:ui` - Playwright test UI

### Docker Development
- `docker compose up -d` - Start all services (PostgreSQL, Redis, MinIO, SuperTokens, MailHog)
- Services: API (8080), Frontend (3000), Postgres (5433), Redis (6379), MinIO (9000/9001), SuperTokens (3567), MailHog (8025)

## Project Architecture

### Tech Stack
- **Backend**: Fastify + Apollo GraphQL + TypeScript
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: SuperTokens (email/password + sessions)
- **Storage**: MinIO (S3-compatible object storage)
- **Cache/Sessions**: Redis
- **Real-time**: Socket.IO for messaging
- **Testing**: Jest (backend), Playwright (frontend E2E)

### Key Services
- **Authentication**: SuperTokens integration in `src/auth/supertokens.ts`
- **Database**: Prisma client with comprehensive schema for profiles, matches, messages
- **GraphQL**: Apollo Server with schema-first approach
- **File Storage**: MinIO service for photo uploads via `src/routes/photos.ts`
- **Real-time Messaging**: Socket.IO service in `src/services/socketio.ts`
- **Content Management**: Content service in `src/services/content.ts`

### Frontend Structure
- **App Router**: Next.js 13+ app directory structure
- **Authentication**: Protected routes with SuperTokens integration
- **State Management**: Apollo Client for GraphQL + React Context
- **Components**: Modular UI components in `frontend/src/components/`
- **Pages**: Core features - onboarding, discovery, chat, matches, admin
- **Real-time**: Socket.IO client integration for live messaging

### Database Schema (Prisma)
- **Users**: Core user data with status management
- **Profiles**: Rich profile data with photos, bio, interests
- **Preferences**: Age range, distance, demographic filters
- **Swipes & Matches**: Dating logic with status tracking
- **Conversations & Messages**: Real-time messaging system
- **Content Management**: Admin-managed prompts and interests

### Development Environment
- Docker Compose orchestrates all services
- Hot reload for both frontend and backend
- PostgreSQL with PostGIS extensions
- Redis for session storage and caching
- MinIO for local S3-compatible storage
- MailHog for email testing

### Security Features
- Rate limiting on API endpoints
- Helmet.js security headers
- CORS configuration
- Input validation with Zod (frontend) and custom validation (backend)
- Mock auth endpoints disabled in production
- Session-based authentication with SuperTokens

### Testing Strategy
- **Backend**: Jest with integration tests in `__tests__/`
- **Frontend**: Playwright E2E tests covering complete user workflows
- **Test Scripts**: Custom test runners for specific feature areas
- **Coverage**: Configured coverage thresholds in Jest config

## Common Workflows

### Setting Up Development
1. `npm install` (root and frontend)
2. `docker compose up -d` (start dependencies)
3. `npm run prisma:migrate` (setup database)
4. `npm run dev` (start backend)
5. `cd frontend && npm run dev` (start frontend)

### Running Tests
- Backend unit tests: `npm test`
- Frontend E2E tests: `cd frontend && npm run test:e2e`
- Specific E2E suites: `cd frontend && npm run test:e2e:auth` (or :onboarding, :discovery, :messaging)

### Database Operations
- Generate client after schema changes: `npm run prisma:generate`
- Create and apply migrations: `npm run prisma:migrate`
- Explore data: `npm run prisma:studio`

### Code Quality
- Always run `npm run lint` and `npm run type-check` before commits
- Frontend: `cd frontend && npm run lint`
- Prettier formatting is enforced via lint-staged hooks