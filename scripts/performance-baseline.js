#!/usr/bin/env node

/**
 * Phase 8: Performance Baseline Measurement Script
 *
 * This script measures and reports current performance baselines for:
 * - GraphQL operation timing averages
 * - Page load times
 * - API response times
 *
 * Usage: node scripts/performance-baseline.js
 */

const { performance } = require('perf_hooks');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:8080';
const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://localhost:3004';
const ITERATIONS = 10;

// Authentication configuration for authenticated tests
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@example.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';

// Performance test results
const results = {
  api: {
    health: [],
    ready: [],
    graphql_introspection: [],
  },
  frontend: {
    homepage: [],
    admin_login: [],
  },
  graphql: {
    simple_queries: [],
    complex_queries: [],
    mutations: [],
  },
  authenticated: {
    me_query: [],
    admin_moderation: [],
    bulk_actions: [],
    user_profile: [],
  },
};

// Utility functions
async function measureApiEndpoint(url, name) {
  const times = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    try {
      const response = await fetch(url);
      const end = performance.now();
      const duration = end - start;

      if (response.ok) {
        times.push(duration);
        console.log(`✓ ${name} #${i + 1}: ${duration.toFixed(2)}ms`);
      } else {
        console.log(`✗ ${name} #${i + 1}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`✗ ${name} #${i + 1}: ${error.message}`);
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return times;
}

async function measureGraphQLQuery(query, variables = {}, name, cookies = '') {
  const times = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add authentication cookies if provided
      if (cookies) {
        headers['Cookie'] = cookies;
      }

      const response = await fetch(`${API_BASE}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
      });

      const end = performance.now();
      const duration = end - start;

      if (response.ok) {
        const data = await response.json();
        if (!data.errors) {
          times.push(duration);
          console.log(`✓ GraphQL ${name} #${i + 1}: ${duration.toFixed(2)}ms`);
        } else {
          console.log(
            `✗ GraphQL ${name} #${i + 1}: GraphQL errors - ${JSON.stringify(data.errors)}`,
          );
        }
      } else {
        console.log(`✗ GraphQL ${name} #${i + 1}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`✗ GraphQL ${name} #${i + 1}: ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return times;
}

function calculateStats(times) {
  if (times.length === 0) return { avg: 0, min: 0, max: 0, p95: 0 };

  const sorted = times.sort((a, b) => a - b);
  const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index];

  return { avg, min, max, p95 };
}

// Authentication helper functions
async function authenticateUser(email, password) {
  try {
    // Step 1: Sign up/in via SuperTokens
    const signInResponse = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formFields: [
          { id: 'email', value: email },
          { id: 'password', value: password },
        ],
      }),
    });

    if (!signInResponse.ok) {
      // Try signup if signin fails
      const signUpResponse = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formFields: [
            { id: 'email', value: email },
            { id: 'password', value: password },
          ],
        }),
      });

      if (!signUpResponse.ok) {
        throw new Error(`Authentication failed: ${signUpResponse.status}`);
      }
    }

    // Extract session cookies from response
    const setCookieHeaders = signInResponse.headers.get('set-cookie') || '';
    const sessionCookies = setCookieHeaders
      .split(',')
      .filter((cookie) => cookie.includes('sAccessToken') || cookie.includes('sRefreshToken'))
      .map((cookie) => cookie.split(';')[0])
      .join('; ');

    return sessionCookies;
  } catch (error) {
    console.log(`Authentication failed for ${email}: ${error.message}`);
    return null;
  }
}

async function createTestUsers() {
  console.log('🔐 Setting up test users...');

  // Create regular test user
  const userCookies = await authenticateUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);

  // Create admin test user
  const adminCookies = await authenticateUser(TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

  return { userCookies, adminCookies };
}

async function runPerformanceBaseline() {
  console.log('🚀 Starting Performance Baseline Measurement');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Frontend Base: ${FRONTEND_BASE}`);
  console.log(`Iterations per test: ${ITERATIONS}\n`);

  // Test API endpoints
  console.log('📊 Testing API Endpoints...');
  results.api.health = await measureApiEndpoint(`${API_BASE}/health`, 'Health Check');
  results.api.ready = await measureApiEndpoint(`${API_BASE}/ready`, 'Ready Check');

  // Test GraphQL introspection
  console.log('\n📊 Testing GraphQL Introspection...');
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        subscriptionType { name }
      }
    }
  `;
  results.graphql.simple_queries = await measureGraphQLQuery(
    introspectionQuery,
    {},
    'Introspection',
  );

  // Test simple GraphQL query
  console.log('\n📊 Testing Simple GraphQL Queries...');
  const simpleQuery = `
    query TestQuery {
      __typename
    }
  `;
  const simpleTimes = await measureGraphQLQuery(simpleQuery, {}, 'Simple Query');
  results.graphql.simple_queries = [...results.graphql.simple_queries, ...simpleTimes];

  // Test complex GraphQL query (if admin moderation is available)
  console.log('\n📊 Testing Complex GraphQL Queries...');
  const complexQuery = `
    query AdminModerationQuery($first: Int, $after: String) {
      adminModeration(first: $first, after: $after) {
        edges {
          node {
            id
            type
            status
            priority
            reporterEmail
            createdAt
            updatedAt
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  `;
  results.graphql.complex_queries = await measureGraphQLQuery(
    complexQuery,
    { first: 10 },
    'Complex Query',
  );

  // Test authenticated operations
  console.log('\n🔐 Setting up authentication for performance tests...');
  const { userCookies, adminCookies } = await createTestUsers();

  if (userCookies) {
    console.log('\n📊 Testing Authenticated User Operations...');

    // Test authenticated me query
    const meQuery = `
      query Me {
        me {
          id
          email
          profile {
            name
            age
            bio
            isAdmin
          }
        }
      }
    `;
    results.authenticated.me_query = await measureGraphQLQuery(
      meQuery,
      {},
      'Me Query',
      userCookies,
    );

    // Test user profile query
    const profileQuery = `
      query UserProfile {
        me {
          id
          profile {
            name
            age
            bio
            location
            interests
            photos {
              id
              url
              order
            }
            preferences {
              minAge
              maxAge
              maxDistance
              interestedIn
            }
          }
        }
      }
    `;
    results.authenticated.user_profile = await measureGraphQLQuery(
      profileQuery,
      {},
      'User Profile',
      userCookies,
    );
  } else {
    console.log('⚠️  Skipping authenticated user tests - authentication failed');
  }

  if (adminCookies) {
    console.log('\n📊 Testing Admin-Protected Operations...');

    // Test admin moderation query
    const adminModerationQuery = `
      query AdminModeration($limit: Int, $offset: Int, $status: String) {
        adminModeration(limit: $limit, offset: $offset, status: $status) {
          items {
            id
            type
            status
            priority
            reporterEmail
            content
            reason
            submittedAt
            user {
              id
              name
              email
            }
          }
          totalCount
          hasMore
        }
      }
    `;
    results.authenticated.admin_moderation = await measureGraphQLQuery(
      adminModerationQuery,
      { limit: 20, offset: 0, status: 'PENDING' },
      'Admin Moderation',
      adminCookies,
    );

    // Test bulk action mutation (simulate with dry run)
    const bulkActionMutation = `
      mutation AdminModerationBulkAction($itemIds: [ID!]!, $action: String!, $reason: String!) {
        adminModerationBulkAction(itemIds: $itemIds, action: $action, reason: $reason)
      }
    `;
    results.authenticated.bulk_actions = await measureGraphQLQuery(
      bulkActionMutation,
      { itemIds: ['test-id-1', 'test-id-2'], action: 'approve', reason: 'Performance test' },
      'Bulk Action',
      adminCookies,
    );
  } else {
    console.log('⚠️  Skipping admin tests - admin authentication failed');
  }

  // Generate report
  console.log('\n📈 Performance Baseline Report');
  console.log('='.repeat(50));

  // API Endpoints
  console.log('\n🔗 API Endpoints:');
  Object.entries(results.api).forEach(([endpoint, times]) => {
    const stats = calculateStats(times);
    console.log(
      `  ${endpoint.padEnd(20)} | Avg: ${stats.avg.toFixed(2)}ms | P95: ${stats.p95.toFixed(2)}ms | Min: ${stats.min.toFixed(2)}ms | Max: ${stats.max.toFixed(2)}ms`,
    );
  });

  // GraphQL Operations
  console.log('\n🔍 GraphQL Operations:');
  Object.entries(results.graphql).forEach(([operation, times]) => {
    const stats = calculateStats(times);
    console.log(
      `  ${operation.padEnd(20)} | Avg: ${stats.avg.toFixed(2)}ms | P95: ${stats.p95.toFixed(2)}ms | Min: ${stats.min.toFixed(2)}ms | Max: ${stats.max.toFixed(2)}ms`,
    );
  });

  // Authenticated Operations
  console.log('\n🔐 Authenticated Operations:');
  Object.entries(results.authenticated).forEach(([operation, times]) => {
    const stats = calculateStats(times);
    const status =
      times.length > 0
        ? `Avg: ${stats.avg.toFixed(2)}ms | P95: ${stats.p95.toFixed(2)}ms | Min: ${stats.min.toFixed(2)}ms | Max: ${stats.max.toFixed(2)}ms`
        : 'SKIPPED (auth failed)';
    console.log(`  ${operation.padEnd(20)} | ${status}`);
  });

  // Performance Assessment
  console.log('\n🎯 Performance Assessment:');
  const apiHealthStats = calculateStats(results.api.health);
  const graphqlSimpleStats = calculateStats(results.graphql.simple_queries);
  const graphqlComplexStats = calculateStats(results.graphql.complex_queries);
  const meQueryStats = calculateStats(results.authenticated.me_query);
  const adminModerationStats = calculateStats(results.authenticated.admin_moderation);

  console.log(
    `  API Health Check: ${apiHealthStats.avg < 50 ? '✅ GOOD' : apiHealthStats.avg < 200 ? '⚠️  FAIR' : '❌ POOR'} (${apiHealthStats.avg.toFixed(2)}ms avg)`,
  );
  console.log(
    `  Simple GraphQL:   ${graphqlSimpleStats.avg < 100 ? '✅ GOOD' : graphqlSimpleStats.avg < 300 ? '⚠️  FAIR' : '❌ POOR'} (${graphqlSimpleStats.avg.toFixed(2)}ms avg)`,
  );
  console.log(
    `  Complex GraphQL:  ${graphqlComplexStats.avg < 500 ? '✅ GOOD' : graphqlComplexStats.avg < 1000 ? '⚠️  FAIR' : '❌ POOR'} (${graphqlComplexStats.avg.toFixed(2)}ms avg)`,
  );

  // Authenticated operation assessments
  if (meQueryStats.avg > 0) {
    console.log(
      `  Me Query (Auth):  ${meQueryStats.p95 < 300 ? '✅ GOOD' : meQueryStats.p95 < 500 ? '⚠️  FAIR' : '❌ POOR'} (${meQueryStats.avg.toFixed(2)}ms avg, ${meQueryStats.p95.toFixed(2)}ms p95)`,
    );
  }
  if (adminModerationStats.avg > 0) {
    console.log(
      `  Admin Moderation: ${adminModerationStats.p95 < 500 ? '✅ GOOD' : adminModerationStats.p95 < 1000 ? '⚠️  FAIR' : '❌ POOR'} (${adminModerationStats.avg.toFixed(2)}ms avg, ${adminModerationStats.p95.toFixed(2)}ms p95)`,
    );
  }

  // Recommendations
  console.log('\n💡 Recommendations:');
  if (apiHealthStats.avg > 100) {
    console.log('  - Consider optimizing API health check endpoint');
  }
  if (graphqlSimpleStats.avg > 200) {
    console.log('  - GraphQL simple queries are slower than expected');
  }
  if (graphqlComplexStats.avg > 1000) {
    console.log('  - Complex GraphQL queries may need optimization');
    console.log('  - Consider implementing query complexity limits');
  }
  if (meQueryStats.avg > 0 && meQueryStats.p95 > 300) {
    console.log('  - Authenticated me query exceeds 300ms p95 target');
    console.log('  - Consider optimizing user profile data fetching');
  }
  if (adminModerationStats.avg > 0 && adminModerationStats.p95 > 500) {
    console.log('  - Admin moderation queries exceed 500ms p95 target');
    console.log('  - Consider implementing pagination optimization');
    console.log('  - Review database indexes for moderation queries');
  }

  // Performance budget validation
  console.log('\n📊 Performance Budget Status:');
  console.log(`  API Health < 50ms:        ${apiHealthStats.avg < 50 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(
    `  Simple GraphQL < 100ms:   ${graphqlSimpleStats.avg < 100 ? '✅ PASS' : '❌ FAIL'}`,
  );
  console.log(
    `  Complex GraphQL < 500ms:  ${graphqlComplexStats.avg < 500 ? '✅ PASS' : '❌ FAIL'}`,
  );
  if (meQueryStats.avg > 0) {
    console.log(`  Me Query p95 < 300ms:     ${meQueryStats.p95 < 300 ? '✅ PASS' : '❌ FAIL'}`);
  }
  if (adminModerationStats.avg > 0) {
    console.log(
      `  Admin Moderation p95 < 500ms: ${adminModerationStats.p95 < 500 ? '✅ PASS' : '❌ FAIL'}`,
    );
  }

  console.log('\n✅ Performance baseline measurement complete!');

  // Save results to file
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = `performance-baseline-${timestamp}.json`;

  const report = {
    timestamp: new Date().toISOString(),
    config: {
      apiBase: API_BASE,
      frontendBase: FRONTEND_BASE,
      iterations: ITERATIONS,
    },
    results: Object.fromEntries(
      Object.entries(results).map(([category, tests]) => [
        category,
        Object.fromEntries(
          Object.entries(tests).map(([test, times]) => [test, calculateStats(times)]),
        ),
      ]),
    ),
  };

  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportFile}`);
}

// Run the baseline measurement
if (require.main === module) {
  runPerformanceBaseline().catch(console.error);
}

module.exports = { runPerformanceBaseline, calculateStats };
