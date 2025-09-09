-- Insert default feature flags
INSERT INTO "FeatureFlag" ("id", "key", "name", "description", "enabled", "targetAudience", "rolloutPercentage", "createdAt", "updatedAt") VALUES
('ff-1', 'enable_video_chat', 'Video Chat', 'Enable video chat functionality', false, 'premium', 0, NOW(), NOW()),
('ff-2', 'enable_voice_messages', 'Voice Messages', 'Enable voice message functionality', true, 'all', 100, NOW(), NOW()),
('ff-3', 'enable_read_receipts', 'Read Receipts', 'Show read receipts in messages', true, 'all', 100, NOW(), NOW()),
('ff-4', 'enable_location_sharing', 'Location Sharing', 'Allow users to share their location', false, 'all', 50, NOW(), NOW()),
('ff-5', 'enable_premium_features', 'Premium Features', 'Enable premium subscription features', true, 'all', 100, NOW(), NOW());

-- Insert default email templates
INSERT INTO "EmailTemplate" ("id", "key", "name", "subject", "htmlContent", "textContent", "category", "createdAt", "updatedAt") VALUES
('et-1', 'welcome', 'Welcome Email', 'Welcome to LoveConnect! 💖',
'<h1>Welcome to LoveConnect!</h1><p>Hi {{name}},</p><p>Welcome to LoveConnect! We''re excited to help you find meaningful connections.</p><p>Get started by completing your profile and uploading your best photos.</p><p>Happy matching!</p><p>The LoveConnect Team</p>',
'Welcome to LoveConnect!\n\nHi {{name}},\n\nWelcome to LoveConnect! We''re excited to help you find meaningful connections.\n\nGet started by completing your profile and uploading your best photos.\n\nHappy matching!\n\nThe LoveConnect Team',
'auth', NOW(), NOW()),

('et-2', 'email_verification', 'Email Verification', 'Verify your LoveConnect email address',
'<h1>Verify Your Email</h1><p>Hi {{name}},</p><p>Please click the link below to verify your email address:</p><p><a href="{{verificationLink}}">Verify Email Address</a></p><p>If you didn''t create an account, you can safely ignore this email.</p>',
'Verify Your Email\n\nHi {{name}},\n\nPlease click the link below to verify your email address:\n\n{{verificationLink}}\n\nIf you didn''t create an account, you can safely ignore this email.',
'auth', NOW(), NOW()),

('et-3', 'password_reset', 'Password Reset', 'Reset your LoveConnect password',
'<h1>Reset Your Password</h1><p>Hi {{name}},</p><p>Click the link below to reset your password:</p><p><a href="{{resetLink}}">Reset Password</a></p><p>This link will expire in 1 hour.</p>',
'Reset Your Password\n\nHi {{name}},\n\nClick the link below to reset your password:\n\n{{resetLink}}\n\nThis link will expire in 1 hour.',
'auth', NOW(), NOW()),

('et-4', 'new_match', 'New Match Notification', 'You have a new match! 💕',
'<h1>You have a new match!</h1><p>Hi {{name}},</p><p>Great news! {{matchName}} liked you back. Start a conversation now!</p><p><a href="{{chatLink}}">Start Chatting</a></p>',
'You have a new match!\n\nHi {{name}},\n\nGreat news! {{matchName}} liked you back. Start a conversation now!\n\n{{chatLink}}',
'notification', NOW(), NOW());

-- Insert default app configuration
INSERT INTO "AppConfig" ("id", "key", "value", "description", "category", "isPublic", "createdAt", "updatedAt") VALUES
('ac-1', 'app_name', '"LoveConnect"', 'Application name', 'branding', true, NOW(), NOW()),
('ac-2', 'app_tagline', '"Find Your Perfect Match"', 'Application tagline', 'branding', true, NOW(), NOW()),
('ac-3', 'max_photos_per_user', '9', 'Maximum photos per user profile', 'limits', false, NOW(), NOW()),
('ac-4', 'max_daily_swipes', '50', 'Maximum daily swipes for free users', 'limits', false, NOW(), NOW()),
('ac-5', 'premium_daily_swipes', '200', 'Maximum daily swipes for premium users', 'limits', false, NOW(), NOW()),
('ac-6', 'match_radius_km', '50', 'Default match radius in kilometers', 'matching', false, NOW(), NOW()),
('ac-7', 'enable_push_notifications', 'true', 'Enable push notifications', 'notifications', false, NOW(), NOW()),
('ac-8', 'support_email', '"support@loveconnect.app"', 'Support email address', 'contact', true, NOW(), NOW());

-- Insert default content pages
INSERT INTO "ContentPage" ("id", "slug", "title", "content", "metaDescription", "published", "createdAt", "updatedAt") VALUES
('cp-1', 'privacy-policy', 'Privacy Policy',
'# Privacy Policy

Last updated: [Date]

## Information We Collect

We collect information you provide directly to us, such as when you create an account, update your profile, or contact us.

## How We Use Your Information

We use the information we collect to provide, maintain, and improve our services.

## Information Sharing

We do not sell, trade, or otherwise transfer your personal information to third parties without your consent.

## Contact Us

If you have questions about this Privacy Policy, please contact us at privacy@loveconnect.app.',
'Learn about how LoveConnect protects your privacy and handles your personal information.',
true, NOW(), NOW()),

('cp-2', 'terms-of-service', 'Terms of Service',
'# Terms of Service

Last updated: [Date]

## Acceptance of Terms

By using LoveConnect, you agree to these terms.

## User Conduct

You agree to use our service responsibly and respectfully.

## Account Termination

We reserve the right to terminate accounts that violate our terms.

## Contact Us

Questions about these terms? Contact us at legal@loveconnect.app.',
'Read the terms and conditions for using LoveConnect dating app.',
true, NOW(), NOW()),

('cp-3', 'about', 'About LoveConnect',
'# About LoveConnect

LoveConnect is a modern dating app designed to help you find meaningful connections.

## Our Mission

To create a safe, inclusive space where people can find love and build lasting relationships.

## Our Values

- Authenticity
- Respect
- Safety
- Inclusivity

## Contact Us

Reach out to us at hello@loveconnect.app',
'Learn more about LoveConnect and our mission to help you find love.',
true, NOW(), NOW());
