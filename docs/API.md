# Dating API

## Authentication
- Uses SuperTokens email/password with session cookies
- Required for all mutations and queries except `health`

## GraphQL Schema (highlights)
- Query
  - health: String!
  - me: Me
  - myProfile: Profile
  - myPreferences: Preferences
  - discoveryFeed(page, pageSize): [Profile!]!
  - myMatches(status, page, pageSize): [MatchView!]!
  - myConversations(page, pageSize): [ConversationView!]!
- Mutation
  - signUp(email, password): MeResult!
  - signIn(email, password): MeResult!
  - signOut: Boolean!
  - upsertMyProfile(input): Profile!
  - upsertMyPreferences(input): Preferences!
  - swipe(targetUserId, direction): SwipeResult!
  - sendMessage(conversationId, content, mediaUrls): Message!
  - markConversationRead(conversationId): Boolean!

## Error Handling
- GraphQL returns safe error messages; server logs include details
- Validation errors include clear messages (e.g., "Invalid age range")

## Rate Limiting
- Global Fastify rate limit; can be tuned via env

## Metrics
- GET /metrics → basic counters (users, matches, conversations)

## Development
- docker compose up -d
- npm run prisma:migrate
- npm run dev


