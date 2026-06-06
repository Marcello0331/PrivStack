import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { jellyfinError, jellyfinJson, resolveJellyfinConfig } from '@/lib/serviceClients/jellyfin';

export const dynamic = 'force-dynamic';

function normalizeSession(session: any) {
  const nowPlaying = session.NowPlayingItem || null;

  return {
    id: session.Id,
    userName: session.UserName || 'Unknown',
    client: session.Client || '',
    deviceName: session.DeviceName || '',
    playState: session.PlayState?.IsPaused ? 'paused' : nowPlaying ? 'playing' : 'idle',
    itemTitle: nowPlaying?.SeriesName || nowPlaying?.Name || '',
    itemSubtitle: nowPlaying?.SeriesName ? nowPlaying?.Name : nowPlaying?.ProductionYear || nowPlaying?.Type || '',
    itemType: nowPlaying?.Type || '',
    progress: nowPlaying?.RunTimeTicks && session.PlayState?.PositionTicks
      ? Math.round((session.PlayState.PositionTicks / nowPlaying.RunTimeTicks) * 1000) / 10
      : 0,
  };
}

function normalizeLibrary(item: any) {
  return {
    id: item.Id,
    name: item.Name || 'Unknown',
    type: item.CollectionType || item.Type || '',
  };
}

function normalizeRecent(item: any) {
  return {
    id: item.Id,
    title: item.SeriesName || item.Name || 'Unknown',
    subtitle: item.SeriesName ? item.Name : item.ProductionYear || item.Type || '',
    type: item.Type || '',
    dateCreated: item.DateCreated || null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = new URL(request.url).searchParams.get('connectionId');
    const config = resolveJellyfinConfig(connectionId);

    if (!config) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const [sessions, counts, libraries, latest] = await Promise.all([
        jellyfinJson<any[]>(config, '/Sessions'),
        jellyfinJson<any>(config, '/Items/Counts'),
        jellyfinJson<any[]>(config, '/Library/VirtualFolders'),
        jellyfinJson<any[]>(config, '/Items/Latest?Limit=12'),
      ]);

      const normalizedSessions = sessions.map(normalizeSession);
      const activeSessions = normalizedSessions.filter((item) => item.itemTitle).length;

      return NextResponse.json({
        activeSessions,
        sessionCount: normalizedSessions.length,
        recentlyAdded: latest.length,
        movieCount: counts.MovieCount || 0,
        showCount: counts.SeriesCount || 0,
        episodeCount: counts.EpisodeCount || 0,
        sessions: normalizedSessions,
        libraries: libraries.map(normalizeLibrary),
        recent: latest.map(normalizeRecent),
      });
    } catch (error) {
      return NextResponse.json(jellyfinError(error), { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
