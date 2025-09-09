// Deprecated NextAuth route: This project standardizes on SuperTokens for authentication.
// Keeping file temporarily to avoid 404s; it returns 410 Gone to signal deprecation.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'NextAuth endpoints are deprecated. Use SuperTokens-based flows.' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'NextAuth endpoints are deprecated. Use SuperTokens-based flows.' }, { status: 410 });
}
