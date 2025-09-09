// Deprecated NextAuth route: backend has standardized on SuperTokens.
// Return 410 Gone to signal deprecation.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'NextAuth endpoints are deprecated. Use SuperTokens-based flows.' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'NextAuth endpoints are deprecated. Use SuperTokens-based flows.' }, { status: 410 });
}
