const fetch = require('node-fetch');

const API_URL = 'http://localhost:8080/graphql';

// Test conversation IDs that we'll use in our E2E tests
const TEST_CONVERSATION_IDS = [
  'test-conversation-alice-bob',
  'test-conversation-alice-charlie', 
  'test-conversation-bob-charlie',
  'test-conversation-realtime',
  'test-socket-io-init',
  'test-socket-events',
  'test-typing-indicators'
];

async function makeGraphQLRequest(query, variables = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return null;
    }
    
    return result.data;
  } catch (error) {
    console.error('Request error:', error);
    return null;
  }
}

async function checkBackendHealth() {
  console.log('🔍 Checking backend health...');
  
  const healthQuery = `
    query {
      health
    }
  `;
  
  const result = await makeGraphQLRequest(healthQuery);
  
  if (result && result.health) {
    console.log('✅ Backend is healthy:', result.health);
    return true;
  } else {
    console.log('❌ Backend health check failed');
    return false;
  }
}

async function checkExistingConversations() {
  console.log('🔍 Checking existing conversations...');
  
  // Try to query conversations without authentication (this might fail, but that's OK)
  const conversationsQuery = `
    query {
      myConversations {
        id
      }
    }
  `;
  
  const result = await makeGraphQLRequest(conversationsQuery);
  
  if (result && result.myConversations) {
    console.log(`✅ Found ${result.myConversations.length} existing conversations`);
    return result.myConversations;
  } else {
    console.log('ℹ️ No conversations found or authentication required');
    return [];
  }
}

async function createTestConversationDirectly() {
  console.log('🧪 Attempting to create test conversation via direct database access...');
  
  // Since we can't easily create conversations via GraphQL without proper authentication,
  // let's create a simple SQL script that can be run directly on the database
  
  const sqlCommands = [
    // Create test users with known IDs
    `INSERT INTO "User" (id, email, "passwordHash", roles, "verificationLevel", "createdAt") 
     VALUES 
       ('test-user-alice', 'alice@test.com', 'dev_only_hash', ARRAY['user'], 'BASIC', NOW()),
       ('test-user-bob', 'bob@test.com', 'dev_only_hash', ARRAY['user'], 'BASIC', NOW()),
       ('test-user-charlie', 'charlie@test.com', 'dev_only_hash', ARRAY['user'], 'BASIC', NOW())
     ON CONFLICT (email) DO NOTHING;`,
    
    // Create profiles for test users
    `INSERT INTO "Profile" ("userId", name, age, gender, bio, interests, photos, prompts, visibility)
     VALUES 
       ('test-user-alice', 'Alice Johnson', 25, 'female', 'Love hiking and coffee ☕', ARRAY['coffee', 'hiking'], ARRAY[]::text[], ARRAY[]::text[], 'PUBLIC'),
       ('test-user-bob', 'Bob Smith', 28, 'male', 'Software engineer who loves cooking 👨‍💻', ARRAY['cooking', 'tech'], ARRAY[]::text[], ARRAY[]::text[], 'PUBLIC'),
       ('test-user-charlie', 'Charlie Brown', 26, 'male', 'Musician and artist 🎵', ARRAY['music', 'art'], ARRAY[]::text[], ARRAY[]::text[], 'PUBLIC')
     ON CONFLICT ("userId") DO NOTHING;`,
    
    // Create matches between users
    `INSERT INTO "Match" (id, "userIdA", "userIdB", "createdAt", status)
     VALUES 
       ('test-match-alice-bob', 'test-user-alice', 'test-user-bob', NOW() - INTERVAL '1 day', 'ACTIVE'),
       ('test-match-alice-charlie', 'test-user-alice', 'test-user-charlie', NOW() - INTERVAL '1 day', 'ACTIVE'),
       ('test-match-bob-charlie', 'test-user-bob', 'test-user-charlie', NOW() - INTERVAL '1 day', 'ACTIVE')
     ON CONFLICT ("userIdA", "userIdB") DO NOTHING;`,
    
    // Create conversations with known IDs
    `INSERT INTO "Conversation" (id, "matchId", "createdAt", "lastMessageAt")
     VALUES 
       ('test-conversation-alice-bob', 'test-match-alice-bob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes'),
       ('test-conversation-alice-charlie', 'test-match-alice-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
       ('test-conversation-bob-charlie', 'test-match-bob-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
       ('test-conversation-realtime', 'test-match-alice-bob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 minutes'),
       ('test-socket-io-init', 'test-match-alice-bob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 minutes'),
       ('test-socket-events', 'test-match-alice-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 minutes'),
       ('test-typing-indicators', 'test-match-bob-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 minutes')
     ON CONFLICT (id) DO NOTHING;`,
    
    // Create some test messages
    `INSERT INTO "Message" (id, "conversationId", "senderId", type, content, "createdAt")
     VALUES 
       ('msg-1', 'test-conversation-alice-bob', 'test-user-alice', 'TEXT', 'Hey Bob! How are you doing?', NOW() - INTERVAL '2 hours'),
       ('msg-2', 'test-conversation-alice-bob', 'test-user-bob', 'TEXT', 'Hi Alice! I''m great, thanks for asking!', NOW() - INTERVAL '1 hour 50 minutes'),
       ('msg-3', 'test-conversation-alice-bob', 'test-user-alice', 'TEXT', 'I saw you love cooking - what''s your favorite dish?', NOW() - INTERVAL '1 hour 40 minutes'),
       ('msg-4', 'test-conversation-alice-bob', 'test-user-bob', 'TEXT', 'I love making pasta! Especially carbonara 🍝', NOW() - INTERVAL '1 hour 30 minutes'),
       ('msg-5', 'test-conversation-alice-charlie', 'test-user-alice', 'TEXT', 'Hi Charlie! I love your music taste 🎵', NOW() - INTERVAL '1 hour 20 minutes'),
       ('msg-6', 'test-conversation-alice-charlie', 'test-user-charlie', 'TEXT', 'Thanks Alice! Do you play any instruments?', NOW() - INTERVAL '1 hour 10 minutes'),
       ('msg-7', 'test-conversation-bob-charlie', 'test-user-bob', 'TEXT', 'Hey Charlie! Fellow creative here 👋', NOW() - INTERVAL '1 hour'),
       ('msg-8', 'test-conversation-bob-charlie', 'test-user-charlie', 'TEXT', 'Hey Bob! Nice to meet you 😊', NOW() - INTERVAL '50 minutes')
     ON CONFLICT (id) DO NOTHING;`
  ];
  
  console.log('📝 Generated SQL commands for test data creation:');
  console.log('');
  sqlCommands.forEach((cmd, index) => {
    console.log(`-- Command ${index + 1}:`);
    console.log(cmd);
    console.log('');
  });
  
  return sqlCommands;
}

async function main() {
  console.log('🧪 Creating test conversation data via API...');
  
  // Check if backend is running
  const isHealthy = await checkBackendHealth();
  
  if (!isHealthy) {
    console.log('❌ Backend is not running or not healthy');
    console.log('💡 Make sure the backend is running on http://localhost:8080');
    return;
  }
  
  // Check existing conversations
  await checkExistingConversations();
  
  // Generate SQL commands for manual execution
  const sqlCommands = await createTestConversationDirectly();
  
  console.log('🎯 Next Steps:');
  console.log('1. Copy the SQL commands above');
  console.log('2. Run them directly on the PostgreSQL database:');
  console.log('   docker exec -it loveconnect-postgres psql -U app -d dating');
  console.log('3. Paste and execute the SQL commands');
  console.log('');
  console.log('🔑 Test Conversation IDs that will be created:');
  TEST_CONVERSATION_IDS.forEach(id => {
    console.log(`   - ${id}`);
  });
  console.log('');
  console.log('👥 Test Users that will be created:');
  console.log('   - alice@test.com (test-user-alice)');
  console.log('   - bob@test.com (test-user-bob)');
  console.log('   - charlie@test.com (test-user-charlie)');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, TEST_CONVERSATION_IDS };
