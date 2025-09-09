import { NextResponse } from 'next/server';

// Deprecated: NextAuth-bound password change API is disabled. Use GraphQL mutation protected by SuperTokens.
export async function POST() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL changeMyPassword mutation.' }, { status: 410 });
}

