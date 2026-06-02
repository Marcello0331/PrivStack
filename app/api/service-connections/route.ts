import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/config';
import {
  createServiceConnection,
  listServiceConnections,
  maskServiceConnection,
} from '@/lib/serviceConnections';

export const dynamic = 'force-dynamic';

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

function validateBody(body: any) {
  const type = String(body.type || '').trim();
  const name = String(body.name || '').trim();
  const url = String(body.url || '').trim();

  if (!type || !name || !url) {
    return null;
  }

  try {
    new URL(url);
  } catch {
    return null;
  }

  return {
    type,
    name,
    url,
    api_key: typeof body.api_key === 'string' ? body.api_key.trim() : '',
    token: typeof body.token === 'string' ? body.token.trim() : '',
    extra_json: typeof body.extra_json === 'string' ? body.extra_json.trim() : '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const type = new URL(request.url).searchParams.get('type') || undefined;
    const connections = listServiceConnections(type).map(maskServiceConnection);
    return NextResponse.json({ connections });
  } catch (error) {
    console.error('List service connections error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const input = validateBody(await request.json());
    if (!input) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const connection = createServiceConnection(input);
    return NextResponse.json({ connection: connection ? maskServiceConnection(connection) : null });
  } catch (error) {
    console.error('Create service connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
