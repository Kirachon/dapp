const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test users that match our E2E test users
const TEST_USERS = [
  {
    email: 'alice@test.com',
    password: 'TestPassword123!',
    name: 'Alice Johnson',
    age: 25,
    gender: 'female',
    bio: 'Love hiking and coffee ☕'
  },
  {
    email: 'bob@test.com', 
    password: 'TestPassword123!',
    name: 'Bob Smith',
    age: 28,
    gender: 'male',
    bio: 'Software engineer who loves cooking 👨‍💻'
  },
  {
    email: 'charlie@test.com',
    password: 'TestPassword123!', 
    name: 'Charlie Brown',
    age: 26,
    gender: 'male',
    bio: 'Musician and artist 🎵'
  }
];

// Known conversation IDs for testing
const TEST_CONVERSATIONS = [
  {
    id: 'test-conversation-alice-bob',
    userAEmail: 'alice@test.com',
    userBEmail: 'bob@test.com',
    messages: [
      { senderEmail: 'alice@test.com', content: 'Hey Bob! How are you doing?', delay: 0 },
      { senderEmail: 'bob@test.com', content: 'Hi Alice! I\'m great, thanks for asking! How about you?', delay: 1 },
      { senderEmail: 'alice@test.com', content: 'I\'m doing well! I saw you love cooking - what\'s your favorite dish to make?', delay: 2 },
      { senderEmail: 'bob@test.com', content: 'I love making pasta dishes! Especially carbonara. Do you cook much?', delay: 3 },
      { senderEmail: 'alice@test.com', content: 'I\'m more of a coffee person, but I\'d love to learn! Maybe you could teach me sometime? 😊', delay: 4 }
    ]
  },
  {
    id: 'test-conversation-alice-charlie',
    userAEmail: 'alice@test.com', 
    userBEmail: 'charlie@test.com',
    messages: [
      { senderEmail: 'alice@test.com', content: 'Hi Charlie! I love your music taste 🎵', delay: 0 },
      { senderEmail: 'charlie@test.com', content: 'Thanks Alice! Do you play any instruments?', delay: 1 },
      { senderEmail: 'alice@test.com', content: 'I used to play guitar in college. Maybe we could jam sometime!', delay: 2 }
    ]
  },
  {
    id: 'test-conversation-bob-charlie',
    userAEmail: 'bob@test.com',
    userBEmail: 'charlie@test.com', 
    messages: [
      { senderEmail: 'bob@test.com', content: 'Hey Charlie! Fellow creative here 👋', delay: 0 },
      { senderEmail: 'charlie@test.com', content: 'Hey Bob! Nice to meet you. What kind of creative work do you do?', delay: 1 },
      { senderEmail: 'bob@test.com', content: 'I do some UI design in my spare time. Love the intersection of tech and art!', delay: 2 }
    ]
  }
];

async function createTestUser(userData) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email }
  });

  if (existingUser) {
    console.log(`✅ User ${userData.email} already exists`);
    return existingUser;
  }

  const user = await prisma.user.create({
    data: {
      email: userData.email,
      passwordHash: 'dev_only_hash', // For testing purposes
      roles: ['user'],
      profile: {
        create: {
          name: userData.name,
          age: userData.age,
          gender: userData.gender,
          bio: userData.bio,
          interests: ['coffee', 'hiking', 'music', 'cooking'],
          photos: [],
          prompts: []
        }
      },
      preferences: {
        create: {
          ageMin: 22,
          ageMax: 35,
          maxDistance: 50,
          genderPreference: userData.gender === 'female' ? 'male' : 'female'
        }
      }
    }
  });
  
  console.log(`✅ Created user: ${userData.name} (${userData.email})`);
  return user;
}

async function createTestConversation(conversationData) {
  // Find users
  const userA = await prisma.user.findUnique({
    where: { email: conversationData.userAEmail }
  });
  
  const userB = await prisma.user.findUnique({
    where: { email: conversationData.userBEmail }
  });
  
  if (!userA || !userB) {
    console.log(`❌ Could not find users for conversation ${conversationData.id}`);
    return null;
  }
  
  // Check if conversation already exists
  const existingConversation = await prisma.conversation.findUnique({
    where: { id: conversationData.id }
  });
  
  if (existingConversation) {
    console.log(`✅ Conversation ${conversationData.id} already exists`);
    return existingConversation;
  }
  
  // Create match first (required for conversation)
  const [userIdA, userIdB] = userA.id < userB.id ? [userA.id, userB.id] : [userB.id, userA.id];
  
  let match = await prisma.match.findUnique({
    where: {
      userIdA_userIdB: { userIdA, userIdB }
    }
  });
  
  if (!match) {
    match = await prisma.match.create({
      data: {
        userIdA,
        userIdB,
        status: 'ACTIVE'
      }
    });
    console.log(`✅ Created match between ${userA.email} and ${userB.email}`);
  }
  
  // Create conversation with specific ID
  const conversation = await prisma.conversation.create({
    data: {
      id: conversationData.id,
      matchId: match.id
    }
  });
  
  // Create messages
  const baseTime = new Date();
  baseTime.setHours(baseTime.getHours() - 2); // Start 2 hours ago
  
  for (const msgData of conversationData.messages) {
    const sender = msgData.senderEmail === userA.email ? userA : userB;
    const messageTime = new Date(baseTime.getTime() + msgData.delay * 10 * 60 * 1000); // 10 min intervals
    
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: sender.id,
        type: 'TEXT',
        content: msgData.content,
        createdAt: messageTime
      }
    });
  }
  
  // Update conversation lastMessageAt
  const lastMessageTime = new Date(baseTime.getTime() + (conversationData.messages.length - 1) * 10 * 60 * 1000);
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: lastMessageTime }
  });
  
  console.log(`✅ Created conversation ${conversationData.id} with ${conversationData.messages.length} messages`);
  return conversation;
}

async function main() {
  console.log('🧪 Creating test conversation data...');
  
  try {
    // Create test users
    console.log('👥 Creating test users...');
    const users = [];
    for (const userData of TEST_USERS) {
      const user = await createTestUser(userData);
      users.push(user);
    }
    
    // Create test conversations
    console.log('💬 Creating test conversations...');
    for (const conversationData of TEST_CONVERSATIONS) {
      await createTestConversation(conversationData);
    }
    
    console.log('🎉 Test conversation data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Test Users: ${TEST_USERS.length}`);
    console.log(`   Test Conversations: ${TEST_CONVERSATIONS.length}`);
    console.log('\n🔑 Test Accounts:');
    TEST_USERS.forEach(user => {
      console.log(`   ${user.email} (password: ${user.password})`);
    });
    console.log('\n💬 Test Conversation IDs:');
    TEST_CONVERSATIONS.forEach(conv => {
      console.log(`   ${conv.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, TEST_USERS, TEST_CONVERSATIONS };
