-- Test data for E2E messaging tests
-- Creates test users, matches, conversations, and messages with known IDs

-- Create test users with known IDs
INSERT INTO "User" (id, email, "passwordHash", roles, "verificationLevel", "createdAt") 
VALUES 
  ('test-user-alice', 'alice@test.com', 'dev_only_hash', ARRAY['user'], 'BASIC', NOW()),
  ('test-user-bob', 'bob@test.com', 'dev_only_hash', ARRAY['user'], 'BASIC', NOW()),
  ('test-user-charlie', 'charlie@test.com', 'dev_only_hash', ARRAY['user'], 'BASIC', NOW())
ON CONFLICT (email) DO NOTHING;

-- Create profiles for test users
INSERT INTO "Profile" ("userId", name, age, gender, bio, interests, photos, prompts, visibility)
VALUES 
  ('test-user-alice', 'Alice Johnson', 25, 'female', 'Love hiking and coffee ☕', ARRAY['coffee', 'hiking'], ARRAY[]::text[], ARRAY[]::text[], 'PUBLIC'),
  ('test-user-bob', 'Bob Smith', 28, 'male', 'Software engineer who loves cooking 👨‍💻', ARRAY['cooking', 'tech'], ARRAY[]::text[], ARRAY[]::text[], 'PUBLIC'),
  ('test-user-charlie', 'Charlie Brown', 26, 'male', 'Musician and artist 🎵', ARRAY['music', 'art'], ARRAY[]::text[], ARRAY[]::text[], 'PUBLIC')
ON CONFLICT ("userId") DO NOTHING;

-- Create preferences for test users
INSERT INTO "Preferences" ("userId", "ageMin", "ageMax", "maxDistance", "genderPreference")
VALUES 
  ('test-user-alice', 22, 35, 50, 'male'),
  ('test-user-bob', 22, 35, 50, 'female'),
  ('test-user-charlie', 22, 35, 50, 'female')
ON CONFLICT ("userId") DO NOTHING;

-- Create matches between users
INSERT INTO "Match" (id, "userIdA", "userIdB", "createdAt", status)
VALUES 
  ('test-match-alice-bob', 'test-user-alice', 'test-user-bob', NOW() - INTERVAL '1 day', 'ACTIVE'),
  ('test-match-alice-charlie', 'test-user-alice', 'test-user-charlie', NOW() - INTERVAL '1 day', 'ACTIVE'),
  ('test-match-bob-charlie', 'test-user-bob', 'test-user-charlie', NOW() - INTERVAL '1 day', 'ACTIVE')
ON CONFLICT ("userIdA", "userIdB") DO NOTHING;

-- Create conversations with known IDs for testing
INSERT INTO "Conversation" (id, "matchId", "createdAt", "lastMessageAt")
VALUES 
  ('test-conversation-alice-bob', 'test-match-alice-bob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes'),
  ('test-conversation-alice-charlie', 'test-match-alice-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
  ('test-conversation-bob-charlie', 'test-match-bob-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
  ('test-conversation-realtime', 'test-match-alice-bob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 minutes'),
  ('test-socket-io-init', 'test-match-alice-bob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 minutes'),
  ('test-socket-events', 'test-match-alice-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 minutes'),
  ('test-typing-indicators', 'test-match-bob-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 minutes')
ON CONFLICT (id) DO NOTHING;

-- Create test messages
INSERT INTO "Message" (id, "conversationId", "senderId", type, content, "createdAt")
VALUES 
  ('msg-1', 'test-conversation-alice-bob', 'test-user-alice', 'TEXT', 'Hey Bob! How are you doing?', NOW() - INTERVAL '2 hours'),
  ('msg-2', 'test-conversation-alice-bob', 'test-user-bob', 'TEXT', 'Hi Alice! I''m great, thanks for asking!', NOW() - INTERVAL '1 hour 50 minutes'),
  ('msg-3', 'test-conversation-alice-bob', 'test-user-alice', 'TEXT', 'I saw you love cooking - what''s your favorite dish?', NOW() - INTERVAL '1 hour 40 minutes'),
  ('msg-4', 'test-conversation-alice-bob', 'test-user-bob', 'TEXT', 'I love making pasta! Especially carbonara 🍝', NOW() - INTERVAL '1 hour 30 minutes'),
  ('msg-5', 'test-conversation-alice-charlie', 'test-user-alice', 'TEXT', 'Hi Charlie! I love your music taste 🎵', NOW() - INTERVAL '1 hour 20 minutes'),
  ('msg-6', 'test-conversation-alice-charlie', 'test-user-charlie', 'TEXT', 'Thanks Alice! Do you play any instruments?', NOW() - INTERVAL '1 hour 10 minutes'),
  ('msg-7', 'test-conversation-bob-charlie', 'test-user-bob', 'TEXT', 'Hey Charlie! Fellow creative here 👋', NOW() - INTERVAL '1 hour'),
  ('msg-8', 'test-conversation-bob-charlie', 'test-user-charlie', 'TEXT', 'Hey Bob! Nice to meet you 😊', NOW() - INTERVAL '50 minutes')
ON CONFLICT (id) DO NOTHING;

-- Verify the data was created
SELECT 'Users created:' as info, COUNT(*) as count FROM "User" WHERE email LIKE '%@test.com';
SELECT 'Profiles created:' as info, COUNT(*) as count FROM "Profile" WHERE "userId" LIKE 'test-user-%';
SELECT 'Matches created:' as info, COUNT(*) as count FROM "Match" WHERE id LIKE 'test-match-%';
SELECT 'Conversations created:' as info, COUNT(*) as count FROM "Conversation" WHERE id LIKE 'test-%';
SELECT 'Messages created:' as info, COUNT(*) as count FROM "Message" WHERE "conversationId" LIKE 'test-%';

-- Show the created conversations
SELECT 
  c.id as conversation_id,
  c."lastMessageAt",
  ua.email as user_a,
  ub.email as user_b,
  COUNT(m.id) as message_count
FROM "Conversation" c
JOIN "Match" ma ON c."matchId" = ma.id
JOIN "User" ua ON ma."userIdA" = ua.id
JOIN "User" ub ON ma."userIdB" = ub.id
LEFT JOIN "Message" m ON c.id = m."conversationId"
WHERE c.id LIKE 'test-%'
GROUP BY c.id, c."lastMessageAt", ua.email, ub.email
ORDER BY c."lastMessageAt" DESC;
