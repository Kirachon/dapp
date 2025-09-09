-- Check if admin user exists
SELECT id, email, roles FROM "User" WHERE email = 'admin@loveconnect.com';

-- Insert admin user if not exists (using the SuperTokens user ID)
INSERT INTO "User" (id, email, "passwordHash", roles, "verificationLevel", "createdAt")
VALUES ('a794d9a0-f130-4bf8-816d-94bc847e8ae1', 'admin@loveconnect.com', '', '{admin,user}', 'VERIFIED', NOW())
ON CONFLICT (id) DO UPDATE SET roles = '{admin,user}';

-- Verify the update
SELECT id, email, roles FROM "User" WHERE email = 'admin@loveconnect.com';
