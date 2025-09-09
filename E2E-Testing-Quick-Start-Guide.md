# E2E Testing Quick Start Guide

## 🚀 Prerequisites

### System Requirements
- **Node.js**: v18+ (recommended v20+)
- **npm**: v8+ (comes with Node.js)
- **Docker**: v20+ with Docker Compose
- **Git**: Latest version
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux

### Development Tools
- **VS Code** (recommended) with Playwright extension
- **Browser**: Chrome/Chromium (automatically installed by Playwright)
- **Terminal**: PowerShell (Windows) or Terminal (macOS/Linux)

## 📦 Environment Setup

### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone <repository-url>
cd dapp

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Verify environment variables (should include):
# DATABASE_URL=postgresql://app:app@localhost:5432/dating
# SUPERTOKENS_CONNECTION_URI=http://localhost:3567
# API_DOMAIN=http://localhost:8080
# WEB_DOMAIN=http://localhost:3000
```

### 3. Docker Services Setup
```bash
# Start all Docker services
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose -f docker-compose.dev.yml ps

# Check service health
docker-compose -f docker-compose.dev.yml logs --tail=10
```

### 4. Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Apply database migrations (if needed)
npm run prisma:migrate

# Seed database with test data
npm run prisma:seed
```

## 🏃‍♂️ Starting the Application

### Terminal 1: Backend API
```bash
# From project root
npm run dev

# Wait for: "API listening on :8080"
# Verify: curl http://localhost:8080/health
```

### Terminal 2: Frontend Application
```bash
# From project root
cd frontend
npx next dev

# Wait for: "Ready - started server on 0.0.0.0:3000"
# Verify: curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

## 🧪 Running E2E Tests

### Install Playwright Browsers
```bash
# From frontend directory
cd frontend
npx playwright install

# Install system dependencies (Linux only)
npx playwright install-deps
```

### Basic Test Execution
```bash
# Run all tests in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test tests/auth.spec.ts --headed

# Run tests with specific browser
npx playwright test --headed --project=chromium
```

### Advanced Test Options
```bash
# Run tests with debug mode
npx playwright test --debug

# Run tests with trace
npx playwright test --trace on

# Run tests with video recording
npx playwright test --video on

# Run specific test by name
npx playwright test --headed -g "should display landing page"
```

### Test Report Access
```bash
# View HTML report (auto-opens after test run)
npx playwright show-report

# Or manually open: http://localhost:9323
```

## 📋 Service Verification Checklist

### ✅ Pre-Test Verification
```bash
# 1. Docker services
docker ps | grep -E "(postgres|redis|minio|mailhog|supertokens)"

# 2. Backend API
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# 3. Frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

# 4. GraphQL endpoint
curl -s http://localhost:8080/graphql
# Expected: GraphQL response (not 404)

# 5. SuperTokens
curl -s http://localhost:3567/hello
# Expected: "Hello"

# 6. MailHog
curl -s -o /dev/null -w "%{http_code}" http://localhost:8025
# Expected: 200
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Port Conflicts
```bash
# Check what's using ports
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # macOS/Linux

# Kill processes if needed
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # macOS/Linux
```

#### Docker Issues
```bash
# Restart Docker services
docker-compose -f docker-compose.dev.yml restart

# Clean restart (removes data)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d

# Check Docker logs
docker-compose -f docker-compose.dev.yml logs <service-name>
```

#### Database Connection Issues
```bash
# Check PostgreSQL connection
docker exec loveconnect-postgres psql -U app -d dating -c "SELECT 1;"

# Reset database
npm run prisma:reset
npm run prisma:seed
```

#### Test Failures
```bash
# Clear browser state
rm -rf frontend/test-results/
rm -rf frontend/playwright-report/

# Update Playwright
cd frontend
npm update @playwright/test
npx playwright install
```

### Service URLs Reference
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **GraphQL**: http://localhost:8080/graphql
- **MailHog**: http://localhost:8025
- **MinIO Console**: http://localhost:9001
- **Test Reports**: http://localhost:9323 (when running)

## 📊 Test Execution Workflow

### 1. Environment Preparation
- [ ] All Docker services running
- [ ] Backend API responding (port 8080)
- [ ] Frontend application loaded (port 3000)
- [ ] Database seeded with test data

### 2. Test Execution
- [ ] Navigate to frontend directory
- [ ] Run tests with `npx playwright test --headed`
- [ ] Monitor test execution in browser windows
- [ ] Review test results and reports

### 3. Results Analysis
- [ ] Check HTML report for detailed results
- [ ] Review screenshots for failed tests
- [ ] Analyze videos for complex failures
- [ ] Check browser console logs if needed

## 🚨 Emergency Reset

If everything breaks, use this nuclear option:
```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down -v

# Clean Node modules
rm -rf node_modules frontend/node_modules
npm install
cd frontend && npm install && cd ..

# Restart everything
docker-compose -f docker-compose.dev.yml up -d
npm run prisma:generate
npm run prisma:seed

# Start services
npm run dev &
cd frontend && npx next dev &
```

## 📞 Support

### Log Locations
- **Backend logs**: Terminal running `npm run dev`
- **Frontend logs**: Terminal running `npx next dev`
- **Docker logs**: `docker-compose logs <service>`
- **Test artifacts**: `frontend/test-results/`
- **Test reports**: `frontend/playwright-report/`

### Useful Commands
```bash
# Check all service status
npm run status  # (if available)

# View all logs
docker-compose -f docker-compose.dev.yml logs --follow

# Database inspection
npx prisma studio  # Opens database GUI
```

---
**Last Updated**: 2025-08-18  
**Tested On**: Windows 11, Node.js v20, Docker v24
