import { PrismaClient, VerificationLevel, ProfileVisibility, SwipeDirection, MatchStatus, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

// Admin user for testing
const ADMIN_USER = {
  email: 'admin@loveconnect.com',
  name: 'Admin User',
  age: 30,
  gender: 'other',
  orientation: 'other',
  bio: 'Platform administrator account for managing LoveConnect.',
  interests: ['administration', 'technology', 'community'],
  education: 'Platform Administration',
  photos: ['https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'],
  location: { latitude: 37.7749, longitude: -122.4194 },
  preferences: { minAge: 18, maxAge: 99, distanceKm: 100, showMe: 'all' }
};

// Realistic test data
const SAMPLE_USERS = [
  {
    email: 'emma.johnson@example.com',
    name: 'Emma Johnson',
    age: 24,
    gender: 'female',
    orientation: 'straight',
    bio: 'Adventure seeker 🏔️ Coffee enthusiast ☕ Dog lover 🐕 Looking for someone to explore the city with!',
    interests: ['hiking', 'photography', 'coffee', 'travel', 'dogs', 'yoga'],
    education: 'Marketing at UC Berkeley',
    photos: [
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400'
    ],
    location: { latitude: 37.7749, longitude: -122.4194 },
    preferences: { minAge: 22, maxAge: 32, distanceKm: 25, showMe: 'male' }
  },
  {
    email: 'alex.chen@example.com',
    name: 'Alex Chen',
    age: 28,
    gender: 'male',
    orientation: 'straight',
    bio: 'Software engineer by day, chef by night 👨‍💻🍳 Love trying new restaurants and cooking at home. Seeking genuine connections!',
    interests: ['cooking', 'technology', 'restaurants', 'wine', 'basketball', 'reading'],
    education: 'Computer Science at Stanford',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400'
    ],
    location: { latitude: 37.7849, longitude: -122.4094 },
    preferences: { minAge: 23, maxAge: 30, distanceKm: 30, showMe: 'female' }
  },
  {
    email: 'sophia.martinez@example.com',
    name: 'Sophia Martinez',
    age: 26,
    gender: 'female',
    orientation: 'straight',
    bio: 'Artist and dreamer 🎨✨ Love painting, museums, and long walks. Looking for someone who appreciates creativity and deep conversations.',
    interests: ['art', 'painting', 'museums', 'literature', 'indie music', 'meditation'],
    education: 'Fine Arts at SFAI',
    photos: [
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'
    ],
    location: { latitude: 37.7649, longitude: -122.4294 },
    preferences: { minAge: 24, maxAge: 35, distanceKm: 40, showMe: 'male' }
  },
  {
    email: 'marcus.williams@example.com',
    name: 'Marcus Williams',
    age: 30,
    gender: 'male',
    orientation: 'straight',
    bio: 'Fitness enthusiast 💪 Entrepreneur 🚀 Love outdoor adventures and building things. Looking for an active partner to share life with!',
    interests: ['fitness', 'entrepreneurship', 'hiking', 'surfing', 'business', 'health'],
    education: 'MBA at Wharton',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
      'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400'
    ],
    location: { latitude: 37.7949, longitude: -122.3994 },
    preferences: { minAge: 25, maxAge: 32, distanceKm: 35, showMe: 'female' }
  },
  {
    email: 'lily.thompson@example.com',
    name: 'Lily Thompson',
    age: 23,
    gender: 'female',
    orientation: 'straight',
    bio: 'Bookworm 📚 Yoga instructor 🧘‍♀️ Plant mom 🌱 Love cozy cafes and meaningful conversations. Seeking someone kind and genuine.',
    interests: ['reading', 'yoga', 'plants', 'tea', 'mindfulness', 'writing'],
    education: 'Psychology at UCSF',
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400'
    ],
    location: { latitude: 37.7549, longitude: -122.4394 },
    preferences: { minAge: 22, maxAge: 28, distanceKm: 20, showMe: 'male' }
  }
];

const ADDITIONAL_USERS = [
  {
    email: 'david.kim@example.com',
    name: 'David Kim',
    age: 27,
    gender: 'male',
    orientation: 'straight',
    bio: 'Music producer 🎵 Vinyl collector 📀 Love live concerts and discovering new artists. Looking for someone who shares my passion for music!',
    interests: ['music', 'concerts', 'vinyl', 'production', 'festivals', 'guitar'],
    education: 'Music Production at Berklee',
    photos: [
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400',
      'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400'
    ],
    location: { latitude: 37.7849, longitude: -122.4194 },
    preferences: { minAge: 22, maxAge: 30, distanceKm: 25, showMe: 'female' }
  },
  {
    email: 'rachel.davis@example.com',
    name: 'Rachel Davis',
    age: 29,
    gender: 'female',
    orientation: 'straight',
    bio: 'Travel blogger ✈️ Foodie 🍜 Always planning my next adventure. Love trying new cuisines and exploring different cultures.',
    interests: ['travel', 'food', 'blogging', 'photography', 'cultures', 'languages'],
    education: 'Journalism at Northwestern',
    photos: [
      'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400',
      'https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=400'
    ],
    location: { latitude: 37.7649, longitude: -122.4094 },
    preferences: { minAge: 26, maxAge: 35, distanceKm: 50, showMe: 'male' }
  }
];

async function createUser(userData: typeof SAMPLE_USERS[0]) {
  return await prisma.user.create({
    data: {
      email: userData.email,
      passwordHash: 'dev_only_hash',
      roles: ['user'],
      verificationLevel: VerificationLevel.BASIC,
      profile: {
        create: {
          name: userData.name,
          age: userData.age,
          gender: userData.gender,
          orientation: userData.orientation,
          bio: userData.bio,
          interests: userData.interests,
          education: userData.education,
          photos: userData.photos,
          visibility: ProfileVisibility.PUBLIC,
        },
      },
      preferences: {
        create: userData.preferences,
      },
      location: {
        create: userData.location,
      },
    },
  });
}

async function createAdminUser(userData: typeof ADMIN_USER) {
  return await prisma.user.create({
    data: {
      email: userData.email,
      passwordHash: 'dev_only_hash',
      roles: ['admin', 'user'], // Admin role for administrative access
      verificationLevel: VerificationLevel.VERIFIED,
      profile: {
        create: {
          name: userData.name,
          age: userData.age,
          gender: userData.gender,
          orientation: userData.orientation,
          bio: userData.bio,
          interests: userData.interests,
          education: userData.education,
          photos: userData.photos,
          visibility: ProfileVisibility.PRIVATE, // Admin profile should be private
        },
      },
      preferences: {
        create: userData.preferences,
      },
      location: {
        create: userData.location,
      },
    },
  });
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.location.deleteMany();
  await prisma.preferences.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleared existing data');

  // Create admin user first
  const adminUser = await createAdminUser(ADMIN_USER);
  console.log(`✅ Created admin user: ${ADMIN_USER.name}`);

  // Create main users
  const users = [];
  for (const userData of SAMPLE_USERS) {
    const user = await createUser(userData);
    users.push(user);
    console.log(`✅ Created user: ${userData.name}`);
  }

  // Create additional users
  for (const userData of ADDITIONAL_USERS) {
    const user = await createUser(userData);
    users.push(user);
    console.log(`✅ Created user: ${userData.name}`);
  }

  console.log(`👥 Created ${users.length} users total`);

  // Create realistic swipes and matches
  const swipePatterns = [
    // Emma (0) and Alex (1) - mutual match
    { userIndex: 0, targetIndex: 1, direction: SwipeDirection.RIGHT },
    { userIndex: 1, targetIndex: 0, direction: SwipeDirection.RIGHT },

    // Sophia (2) and Marcus (3) - mutual match
    { userIndex: 2, targetIndex: 3, direction: SwipeDirection.RIGHT },
    { userIndex: 3, targetIndex: 2, direction: SwipeDirection.RIGHT },

    // Lily (4) and David (5) - mutual match
    { userIndex: 4, targetIndex: 5, direction: SwipeDirection.RIGHT },
    { userIndex: 5, targetIndex: 4, direction: SwipeDirection.RIGHT },

    // Some one-sided swipes (no matches)
    { userIndex: 0, targetIndex: 3, direction: SwipeDirection.RIGHT },
    { userIndex: 3, targetIndex: 0, direction: SwipeDirection.LEFT },
    { userIndex: 1, targetIndex: 2, direction: SwipeDirection.SUPER },
    { userIndex: 2, targetIndex: 1, direction: SwipeDirection.LEFT },
    { userIndex: 4, targetIndex: 6, direction: SwipeDirection.RIGHT },
    { userIndex: 6, targetIndex: 4, direction: SwipeDirection.LEFT },
  ];

  // Create swipes
  for (const swipe of swipePatterns) {
    if (users[swipe.userIndex] && users[swipe.targetIndex]) {
      await prisma.swipe.create({
        data: {
          userId: users[swipe.userIndex].id,
          targetUserId: users[swipe.targetIndex].id,
          direction: swipe.direction,
        },
      });
    }
  }
  console.log('💫 Created swipes');

  // Create matches for mutual right swipes
  const matchPairs = [
    [0, 1], // Emma & Alex
    [2, 3], // Sophia & Marcus
    [4, 5], // Lily & David
  ];

  const matches = [];
  for (const [userAIndex, userBIndex] of matchPairs) {
    if (users[userAIndex] && users[userBIndex]) {
      const userA = users[userAIndex];
      const userB = users[userBIndex];

      // Ensure consistent ordering for unique constraint
      const [userIdA, userIdB] = userA.id < userB.id ? [userA.id, userB.id] : [userB.id, userA.id];

      const match = await prisma.match.create({
        data: {
          userIdA,
          userIdB,
          status: MatchStatus.ACTIVE,
        },
      });
      matches.push(match);
    }
  }
  console.log(`💕 Created ${matches.length} matches`);

  // Create conversations and messages
  const conversationData = [
    {
      matchIndex: 0,
      messages: [
        { senderIndex: 0, content: "Hey Alex! I saw you love cooking - what's your signature dish? 👨‍🍳", delay: 0 },
        { senderIndex: 1, content: "Hi Emma! I make a mean carbonara 🍝 What about you? Any favorite cuisines?", delay: 1 },
        { senderIndex: 0, content: "Ooh I love Italian food! I'm more of a coffee and brunch person myself ☕", delay: 2 },
        { senderIndex: 1, content: "Perfect combo! Want to grab brunch this weekend? I know a great spot in North Beach", delay: 3 },
        { senderIndex: 0, content: "That sounds amazing! I'd love to 😊", delay: 4 },
      ]
    },
    {
      matchIndex: 1,
      messages: [
        { senderIndex: 2, content: "Hi Marcus! Your hiking photos are incredible 🏔️ Where was that last one taken?", delay: 0 },
        { senderIndex: 3, content: "Thanks Sophia! That was at Half Dome in Yosemite. Are you into hiking too?", delay: 1 },
        { senderIndex: 2, content: "I love it! Though I'm more of a casual hiker. Your fitness routine is inspiring 💪", delay: 2 },
        { senderIndex: 3, content: "We should go on an easy trail together sometime! I know some beautiful spots with great views for painting", delay: 3 },
      ]
    },
    {
      matchIndex: 2,
      messages: [
        { senderIndex: 4, content: "David! I love your music taste 🎵 Do you have any recommendations for indie artists?", delay: 0 },
        { senderIndex: 5, content: "Hey Lily! You should check out Phoebe Bridgers and Clairo if you haven't already", delay: 1 },
        { senderIndex: 4, content: "I love Phoebe! Haven't heard much Clairo though, I'll definitely listen", delay: 2 },
      ]
    }
  ];

  for (const convData of conversationData) {
    if (matches[convData.matchIndex]) {
      const conversation = await prisma.conversation.create({
        data: {
          matchId: matches[convData.matchIndex].id,
        },
      });

      // Create messages with realistic timestamps
      const baseTime = new Date();
      baseTime.setHours(baseTime.getHours() - 24); // Start 24 hours ago

      for (const msgData of convData.messages) {
        const messageTime = new Date(baseTime.getTime() + msgData.delay * 15 * 60 * 1000); // 15 min intervals

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: users[msgData.senderIndex].id,
            type: MessageType.TEXT,
            content: msgData.content,
            createdAt: messageTime,
          },
        });
      }

      // Update conversation lastMessageAt
      const lastMessageTime = new Date(baseTime.getTime() + (convData.messages.length - 1) * 15 * 60 * 1000);
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: lastMessageTime },
      });
    }
  }
  console.log('💬 Created conversations and messages');

  console.log('🎉 Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Users: ${users.length}`);
  console.log(`   Matches: ${matches.length}`);
  console.log(`   Conversations: ${conversationData.length}`);
  console.log('\n🔐 Test accounts:');
  console.log('   🔑 ADMIN: admin@loveconnect.com (password: admin123)');
  console.log('   emma.johnson@example.com');
  console.log('   alex.chen@example.com');
  console.log('   sophia.martinez@example.com');
  console.log('   marcus.williams@example.com');
  console.log('   lily.thompson@example.com');
  console.log('   david.kim@example.com');
  console.log('   rachel.davis@example.com');
}

main()
  .then(async () => {
    console.log('Seed completed');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

