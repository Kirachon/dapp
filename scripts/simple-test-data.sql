-- Simple test data creation - just the essential conversations for testing

-- Clear any existing test conversations and messages
DELETE FROM "Message" WHERE "conversationId" LIKE 'test-%';
DELETE FROM "Conversation" WHERE id LIKE 'test-%';

-- Create conversations using existing matches
INSERT INTO "Conversation" (id, "matchId", "createdAt", "lastMessageAt")
VALUES 
  ('test-conversation-alice-bob', 'test-match-alice-bob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes'),
  ('test-conversation-alice-charlie', 'test-match-alice-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
  ('test-conversation-bob-charlie', 'test-match-bob-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Create test messages for the conversations
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
SELECT 'Simple test data created successfully' as status;
SELECT 'Total conversations:' as info, COUNT(*) as count FROM "Conversation" WHERE id LIKE 'test-%';
SELECT 'Total messages:' as info, COUNT(*) as count FROM "Message" WHERE "conversationId" LIKE 'test-%';

-- Show the created conversations with details
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

-- Show sample messages
SELECT 
  m.id,
  m."conversationId",
  u.email as sender,
  m.content,
  m."createdAt"
FROM "Message" m
JOIN "User" u ON m."senderId" = u.id
WHERE m."conversationId" LIKE 'test-%'
ORDER BY m."createdAt" ASC
LIMIT 10;
