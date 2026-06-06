import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/config';
import {
  resolveServarrConfig,
  servarrError,
  servarrFetch,
} from '@/lib/serviceClients/servarr';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS = new Set(['sync-apps', 'test-indexer', 'test-all-indexers']);

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

async function postCommand(config: NonNullable<ReturnType<typeof resolveServarrConfig>>, body: Record<string, unknown>) {
  const response = await servarrFetch(config, '/api/v1/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 401 || response.status === 403) throw new Error('auth_failed');
  if (!response.ok) throw new Error('unreachable');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim();

    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }

    const config = resolveServarrConfig('prowlarr', body.connectionId ? String(body.connectionId) : null);
    if (!config) {
      return NextResponse.json({ error: 'not_configured' }, { status: 400 });
    }

    try {
      if (action === 'sync-apps') {
        await postCommand(config, { name: 'ApplicationSync' });
      }

      if (action === 'test-all-indexers') {
        await postCommand(config, { name: 'IndexerTestAll' });
      }

      if (action === 'test-indexer') {
        const indexerId = Number(body.indexerId);
        if (!Number.isFinite(indexerId)) {
          return NextResponse.json({ error: 'missing_indexer_id' }, { status: 400 });
        }

        await postCommand(config, { name: 'IndexerTest', indexerId });
      }

      return NextResponse.json({ success: true, action });
    } catch (error) {
      return NextResponse.json(servarrError(error), { status: 502 });
    }
  } catch (error) {
    console.error('Prowlarr action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
