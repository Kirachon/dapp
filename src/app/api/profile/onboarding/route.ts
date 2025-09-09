import { NextResponse } from 'next/server';

// Deprecated: Onboarding API is replaced by GraphQL me/upsertMyProfile flows protected via SuperTokens.
export async function GET() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL me.' }, { status: 410 });
}
export async function PUT() {
  return NextResponse.json({ error: 'Deprecated endpoint. Use GraphQL upsertMyProfile.' }, { status: 410 });
}

