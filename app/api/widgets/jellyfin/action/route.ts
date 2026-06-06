import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/config';
import { jellyfinError, jellyfinFetch, resolveJellyfinConfig } from '@/lib/serviceClients/jellyfin';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS = new Set(['refresh-library', 'stop-session']);

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
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

    const config = resolveJellyfinConfig(body.connectionId ? String(body.connectionId) : null);
    if (!config) {
      return NextResponse.json({ error: 'not_configured' }, { status: 400 });
    }

    try {
      if (action === 'refresh-library') {
        const response = await jellyfinFetch(config, '/Library/Refresh', { method: 'POST' });
        if (response.status === 401 || response.status === 403) throw new Error('auth_failed');
        if (!response.ok) throw new Error('unreachable');
      }

      if (action === 'stop-session') {
        const sessionId = String(body.sessionId || '').trim();
        if (!sessionId) {
          return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });
        }

        const response = await jellyfinFetch(config, `/Sessions/${encodeURIComponent(sessionId)}/Playing/Stop`, { method: 'POST' });
        if (response.status === 401 || response.status === 403) throw new Error('auth_failed');
        if (!response.ok) throw new Error('unreachable');
      }

      return NextResponse.json({ success: true, action });
    } catch (error) {
      return NextResponse.json(jellyfinError(error), { status: 502 });
    }
  } catch (error) {
    console.error('Jellyfin action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
