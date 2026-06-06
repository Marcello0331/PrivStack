import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/config';
import {
  resolveServarrConfig,
  servarrError,
  servarrFetch,
} from '@/lib/serviceClients/servarr';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS = new Set(['refresh', 'search-missing', 'remove-queue']);

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

async function postCommand(config: NonNullable<ReturnType<typeof resolveServarrConfig>>, name: string) {
  const response = await servarrFetch(config, '/api/v3/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
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

    const config = resolveServarrConfig('sonarr', body.connectionId ? String(body.connectionId) : null);
    if (!config) {
      return NextResponse.json({ error: 'not_configured' }, { status: 400 });
    }

    try {
      if (action === 'refresh') {
        await postCommand(config, 'RefreshSeries');
      }

      if (action === 'search-missing') {
        await postCommand(config, 'MissingEpisodeSearch');
      }

      if (action === 'remove-queue') {
        const queueId = Number(body.queueId);
        if (!Number.isFinite(queueId)) {
          return NextResponse.json({ error: 'missing_queue_id' }, { status: 400 });
        }

        const response = await servarrFetch(
          config,
          `/api/v3/queue/${queueId}?removeFromClient=${body.removeFromClient ? 'true' : 'false'}&blocklist=${body.blocklist ? 'true' : 'false'}`,
          { method: 'DELETE' }
        );

        if (response.status === 401 || response.status === 403) throw new Error('auth_failed');
        if (!response.ok) throw new Error('unreachable');
      }

      return NextResponse.json({ success: true, action });
    } catch (error) {
      return NextResponse.json(servarrError(error), { status: 502 });
    }
  } catch (error) {
    console.error('Sonarr action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
