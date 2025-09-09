import { NextRequest, NextResponse } from 'next/server';

// Proxy GraphQL requests from the frontend origin to the backend API to avoid cross-site cookie issues
export const runtime = 'nodejs';

const BACKEND_GRAPHQL = process.env.NEXT_PUBLIC_API_BACKEND_GRAPHQL || 'http://localhost:8080/graphql';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const res = await fetch(BACKEND_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies and SuperTokens anti-CSRF token
        'cookie': req.headers.get('cookie') || '',
        'anti-csrf': req.headers.get('anti-csrf') || req.headers.get('st-anti-csrf') || '',
        // Forward correlation IDs where available
        'x-correlation-id': req.headers.get('x-correlation-id') || ''
      },
      body,
      // Include credentials so API can set/read session cookies
      credentials: 'include',
    });

    const text = await res.text();
    const response = new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Forward Set-Cookie headers from backend to the browser
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }

    return response;
  } catch (e: any) {
    return NextResponse.json({ errors: [{ message: e?.message || 'GraphQL proxy error' }] }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Optional support for GET GraphQL queries
  const url = new URL(req.url);
  const query = url.searchParams.get('query');
  const variables = url.searchParams.get('variables');
  return POST(new NextRequest(req.url, { method: 'POST', body: JSON.stringify({ query, variables: variables ? JSON.parse(variables) : undefined }) } as any));
}

