import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/config';
import {
  createQbittorrentSession,
  qbittorrentError,
  resolveQbittorrentConfig,
} from '@/lib/serviceClients/qbittorrent';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS = new Set(['pause', 'resume', 'recheck', 'delete']);

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

function hashesFromBody(body: any) {
  if (body.hashes === 'all') return 'all';
  if (Array.isArray(body.hashes)) {
    return body.hashes.map((hash: unknown) => String(hash).trim()).filter(Boolean).join('|');
  }
  return String(body.hash || '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim();
    const hashes = hashesFromBody(body);

    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }

    if (!hashes) {
      return NextResponse.json({ error: 'missing_hash' }, { status: 400 });
    }

    const config = resolveQbittorrentConfig(body.connectionId ? String(body.connectionId) : null);
    if (!config) {
      return NextResponse.json({ error: 'not_configured' }, { status: 400 });
    }

    try {
      const client = await createQbittorrentSession(config);
      const form = new URLSearchParams({ hashes });
      let endpoint = `/api/v2/torrents/${action}`;

      if (action === 'delete') {
        form.set('deleteFiles', body.deleteFiles ? 'true' : 'false');
      }

      const response = await client.request(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form,
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'action_failed' }, { status: 502 });
      }

      return NextResponse.json({ success: true, action });
    } catch (error) {
      return NextResponse.json(qbittorrentError(error), { status: 502 });
    }
  } catch (error) {
    console.error('qBittorrent action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
