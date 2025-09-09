import { NextResponse } from 'next/server';

// Deprecated route: NextAuth-based Activation API is removed. Use GraphQL queries for activation data.
export async function GET() {
  return NextResponse.json({ error: 'This endpoint is deprecated. Use GraphQL instead.' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'This endpoint is deprecated. Use GraphQL instead.' }, { status: 410 });
}

