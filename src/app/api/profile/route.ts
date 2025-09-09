import { NextResponse } from 'next/server';

// Deprecated: NextAuth-bound profile API is disabled. Use GraphQL me/upsertMyProfile protected by SuperTokens.
export async function GET() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL me query.' }, { status: 410 });
}
export async function PUT() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL upsertMyProfile mutation.' }, { status: 410 });
}

