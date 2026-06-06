import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/config';
import { plexError, plexFetch, resolvePlexConfig } from '@/lib/serviceClients/plex';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS = new Set(['refresh-library', 'terminate-session']);

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

    const config = resolvePlexConfig(body.connectionId ? String(body.connectionId) : null);
    if (!config) {
      return NextResponse.json({ error: 'not_configured' }, { status: 400 });
    }

    try {
      if (action === 'refresh-library') {
        const libraryKey = String(body.libraryKey || '').trim();
        if (!libraryKey) {
          return NextResponse.json({ error: 'missing_library_key' }, { status: 400 });
        }

        const response = await plexFetch(config, `/library/sections/${encodeURIComponent(libraryKey)}/refresh`, { method: 'GET' });
        if (response.status === 401 || response.status === 403) throw new Error('auth_failed');
        if (!response.ok) throw new Error('unreachable');
      }

      if (action === 'terminate-session') {
        const sessionId = String(body.sessionId || '').trim();
        if (!sessionId) {
          return NextResponse.json({ error: 'missing_session_id' }, { status: 400 });
        }

        const reason = encodeURIComponent('Stopped from PrivStack');
        const response = await plexFetch(config, `/status/sessions/terminate?sessionId=${encodeURIComponent(sessionId)}&reason=${reason}`, { method: 'GET' });
        if (response.status === 401 || response.status === 403) throw new Error('auth_failed');
        if (!response.ok) throw new Error('unreachable');
      }

      return NextResponse.json({ success: true, action });
    } catch (error) {
      return NextResponse.json(plexError(error), { status: 502 });
    }
  } catch (error) {
    console.error('Plex action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
