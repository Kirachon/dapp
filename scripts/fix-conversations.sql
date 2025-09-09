-- Fix conversations by creating additional matches for test conversations
-- Each conversation needs a unique match

-- Create additional matches for test conversations
INSERT INTO "Match" (id, "userIdA", "userIdB", "createdAt", status)
VALUES 
  ('test-match-realtime', 'test-user-alice', 'test-user-bob', NOW() - INTERVAL '1 day', 'ACTIVE'),
  ('test-match-socket-init', 'test-user-alice', 'test-user-bob', NOW() - INTERVAL '1 day', 'ACTIVE'),
  ('test-match-socket-events', 'test-user-alice', 'test-user-charlie', NOW() - INTERVAL '1 day', 'ACTIVE'),
  ('test-match-typing', 'test-user-bob', 'test-user-charlie', NOW() - INTERVAL '1 day', 'ACTIVE')
ON CONFLICT ("userIdA", "userIdB") DO UPDATE SET status = EXCLUDED.status;

-- Now create conversations with unique matchIds
INSERT INTO "Conversation" (id, "matchId", "createdAt", "lastMessageAt")
VALUES 
  ('test-conversation-alice-bob', 'test-match-alice-bob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes'),
  ('test-conversation-alice-charlie', 'test-match-alice-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'),
  ('test-conversation-bob-charlie', 'test-match-bob-charlie', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 hours'),
  ('test-conversation-realtime', 'test-match-realtime', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 minutes'),
  ('test-socket-io-init', 'test-match-socket-init', NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 minutes'),
  ('test-socket-events', 'test-match-socket-events', NOW() - INTERVAL '1 day', NOW() - INTERVAL '15 minutes'),
  ('test-typing-indicators', 'test-match-typing', NOW() - INTERVAL '1 day', NOW() - INTERVAL '20 minutes')
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
  ('msg-8', 'test-conversation-bob-charlie', 'test-user-charlie', 'TEXT', 'Hey Bob! Nice to meet you 😊', NOW() - INTERVAL '50 minutes'),
  ('msg-9', 'test-conversation-realtime', 'test-user-alice', 'TEXT', 'Testing real-time messaging!', NOW() - INTERVAL '10 minutes'),
  ('msg-10', 'test-socket-io-init', 'test-user-alice', 'TEXT', 'Socket.IO initialization test', NOW() - INTERVAL '15 minutes'),
  ('msg-11', 'test-socket-events', 'test-user-alice', 'TEXT', 'Socket events test message', NOW() - INTERVAL '20 minutes'),
  ('msg-12', 'test-typing-indicators', 'test-user-bob', 'TEXT', 'Typing indicators test', NOW() - INTERVAL '25 minutes')
ON CONFLICT (id) DO NOTHING;

-- Verify the data was created
SELECT 'Fixed conversations and messages' as status;
SELECT 'Total matches:' as info, COUNT(*) as count FROM "Match" WHERE id LIKE 'test-match-%';
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
