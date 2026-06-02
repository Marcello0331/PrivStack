import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import {
  deleteServiceConnection,
  getServiceConnection,
  maskServiceConnection,
  updateServiceConnection,
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

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = getServiceConnection(Number(params.id));
    if (!connection) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ connection: maskServiceConnection(connection) });
  } catch (error) {
    console.error('Get service connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const input = validateBody(await request.json());
    if (!input) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }

    const connection = updateServiceConnection(Number(params.id), input);
    if (!connection) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({ connection: maskServiceConnection(connection) });
  } catch (error) {
    console.error('Update service connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    deleteServiceConnection(Number(params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete service connection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
