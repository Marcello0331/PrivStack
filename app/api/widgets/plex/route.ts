import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { plexError, plexJson, resolvePlexConfig } from '@/lib/serviceClients/plex';

export const dynamic = 'force-dynamic';

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeSession(item: any) {
  const session = item.Session || {};
  const user = item.User || {};
  const player = item.Player || {};

  return {
    sessionId: session.id || item.sessionKey || '',
    title: item.grandparentTitle || item.parentTitle || item.title || 'Unknown',
    subtitle: [item.title && item.grandparentTitle ? item.title : '', player.product || player.title || '', player.state || ''].filter(Boolean).join(' - '),
    user: user.title || user.username || 'Unknown',
    player: player.product || player.title || '',
    state: player.state || 'unknown',
    type: item.type || '',
    progress: item.duration ? Math.round(((item.viewOffset || 0) / item.duration) * 1000) / 10 : 0,
  };
}

function normalizeLibrary(item: any) {
  return {
    key: item.key,
    title: item.title || 'Unknown',
    type: item.type || '',
    count: Number(item.count || 0),
  };
}

function normalizeRecent(item: any) {
  return {
    ratingKey: item.ratingKey,
    title: item.grandparentTitle || item.title || 'Unknown',
    subtitle: item.grandparentTitle ? item.title : item.year || item.type || '',
    type: item.type || '',
    addedAt: item.addedAt ? new Date(Number(item.addedAt) * 1000).toISOString() : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = new URL(request.url).searchParams.get('connectionId');
    const config = resolvePlexConfig(connectionId);

    if (!config) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const [sessionsData, librariesData, recentData] = await Promise.all([
        plexJson<any>(config, '/status/sessions'),
        plexJson<any>(config, '/library/sections'),
        plexJson<any>(config, '/library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=12'),
      ]);

      const sessions = asArray(sessionsData?.MediaContainer?.Metadata).map(normalizeSession);
      const libraries = asArray(librariesData?.MediaContainer?.Directory).map(normalizeLibrary);
      const recent = asArray(recentData?.MediaContainer?.Metadata).map(normalizeRecent);

      return NextResponse.json({
        activeStreams: sessions.length,
        libraryCount: libraries.length,
        recentlyAdded: recent.length,
        status: 'Ready',
        sessions,
        libraries,
        recent,
      });
    } catch (error) {
      return NextResponse.json(plexError(error), { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
