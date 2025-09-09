import { NextResponse } from 'next/server';

// Deprecated: NextAuth-bound change-email API is disabled. Use settings via GraphQL + SuperTokens.
export async function POST() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL settings mutations.' }, { status: 410 });
}
export async function PUT() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL settings mutations.' }, { status: 410 });
}

