# Live Application URLs - E2E Testing Environment

## 🚀 Application Services

### Frontend Application
- **URL**: http://localhost:3000
- **Status**: ✅ Running
- **Description**: Next.js 15.4.6 application with React 19.1.0, Tailwind CSS 4, and Apollo Client
- **Features**: Responsive design, authentication, real-time messaging, user profiles

### Backend API
- **URL**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **Status**: ✅ Running
- **Description**: Fastify server with GraphQL, SuperTokens auth, and Socket.IO real-time features

### GraphQL Playground
- **URL**: http://localhost:8080/graphql
- **Status**: ✅ Running
- **Description**: Interactive GraphQL API explorer for testing queries and mutations
- **Note**: Requires proper authentication headers for protected operations

## 🔧 Development & Testing Services

### MailHog (Email Testing)
- **Web Interface**: http://localhost:8025
- **SMTP Server**: localhost:1025
- **Status**: ✅ Running
- **Description**: Email testing service for capturing and viewing sent emails during development

### SuperTokens Dashboard
- **URL**: http://localhost:3567/hello
- **Status**: ✅ Running
- **Description**: Authentication service health check endpoint

### MinIO (Object Storage)
- **Console**: http://localhost:9001
- **API**: http://localhost:9000
- **Status**: ✅ Running
- **Description**: S3-compatible object storage for file uploads and media

## 📊 Database & Cache Services

### PostgreSQL Database
- **Host**: localhost
- **Port**: 5432
- **Database**: dating
- **Username**: app
- **Status**: ✅ Running
- **Description**: Primary application database with SuperTokens tables

### Redis Cache
- **Host**: localhost
- **Port**: 6379
- **Status**: ✅ Running
- **Description**: Caching and real-time messaging support via Socket.IO Redis adapter

## 🧪 Testing Services

### Playwright Test Reports
- **URL**: http://localhost:9323 (when tests are running)
- **Description**: Live HTML test reports with screenshots, videos, and failure details
- **Location**: `frontend/test-results/`

## 📋 Service Status Summary

| Service | URL | Port | Status | Response Time |
|---------|-----|------|--------|---------------|
| Frontend | http://localhost:3000 | 3000 | ✅ Running | <100ms |
| Backend API | http://localhost:8080 | 8080 | ✅ Running | <50ms |
| GraphQL | http://localhost:8080/graphql | 8080 | ✅ Running | <50ms |
| PostgreSQL | localhost | 5432 | ✅ Running | <10ms |
| Redis | localhost | 6379 | ✅ Running | <5ms |
| MinIO | http://localhost:9000 | 9000 | ✅ Running | <20ms |
| MailHog | http://localhost:8025 | 8025 | ✅ Running | <30ms |
| SuperTokens | http://localhost:3567 | 3567 | ✅ Running | <20ms |

## 🔍 Quick Access Commands

### Health Checks
```bash
# Frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000

# Backend API
curl -s http://localhost:8080/health

# SuperTokens
curl -s http://localhost:3567/hello

# MailHog
curl -s -o /dev/null -w "%{http_code}" http://localhost:8025
```

### Service Logs
```bash
# Backend API logs
# Check terminal where `npm run dev` is running

# Docker services logs
docker-compose -f docker-compose.dev.yml logs --tail=20

# Frontend logs
# Check terminal where `npx next dev` is running
```

## 📝 Notes

- All services are running in development mode
- CORS is configured for localhost origins
- Authentication cookies are set for localhost domain
- Real-time features use WebSocket connections on the same ports as HTTP services
- Test artifacts (screenshots, videos) are stored in `frontend/test-results/`

## 🚨 Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure no other services are using the required ports
2. **Database connection**: Verify PostgreSQL is running and accessible
3. **CORS errors**: Check that frontend and backend are on expected localhost ports
4. **Authentication issues**: Clear browser cookies and localStorage if needed

### Service Restart Commands
```bash
# Restart Docker services
docker-compose -f docker-compose.dev.yml restart

# Restart backend (in project root)
npm run dev

# Restart frontend (in frontend directory)
npx next dev
```

---
*Last updated: 2025-08-18 - All services verified operational*
