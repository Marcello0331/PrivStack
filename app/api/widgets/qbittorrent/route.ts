import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import {
  createQbittorrentSession,
  qbittorrentError,
  resolveQbittorrentConfig,
} from '@/lib/serviceClients/qbittorrent';

export const dynamic = 'force-dynamic';

function formatBytesPerSecond(value: number) {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB/s`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB/s`;
  return `${value || 0} B/s`;
}

function normalizeTorrent(hash: string, torrent: any) {
  return {
    hash,
    name: torrent.name || hash,
    size: torrent.size || 0,
    progress: Math.round((torrent.progress || 0) * 1000) / 10,
    state: torrent.state || 'unknown',
    category: torrent.category || '',
    tags: torrent.tags || '',
    downSpeed: torrent.dl_speed || 0,
    upSpeed: torrent.up_speed || 0,
    eta: torrent.eta || 0,
    ratio: typeof torrent.ratio === 'number' ? Math.round(torrent.ratio * 100) / 100 : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = new URL(request.url).searchParams.get('connectionId');
    const config = resolveQbittorrentConfig(connectionId);

    if (!config) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const client = await createQbittorrentSession(config);
      const response = await client.request('/api/v2/sync/maindata');
      if (!response.ok) {
        return NextResponse.json({ error: 'unreachable' }, { status: 502 });
      }

      const data = await response.json();
      const torrents = data.torrents || {};
      const torrentList = Object.entries(torrents)
        .map(([hash, torrent]) => normalizeTorrent(hash, torrent))
        .sort((a, b) => b.downSpeed - a.downSpeed || a.name.localeCompare(b.name));

      const active = torrentList.filter((torrent) => ['downloading', 'uploading', 'stalledDL', 'stalledUP'].includes(torrent.state)).length;
      const paused = torrentList.filter((torrent) => torrent.state.toLowerCase().includes('paused')).length;
      const speeds = torrentList.reduce(
        (acc: { down: number; up: number }, t: any) => ({
          down: acc.down + (t.downSpeed || 0),
          up: acc.up + (t.upSpeed || 0),
        }),
        { down: 0, up: 0 }
      );

      return NextResponse.json({
        activeTorrents: active,
        pausedTorrents: paused,
        totalTorrents: torrentList.length,
        downSpeed: speeds.down / 1024 / 1024,
        upSpeed: speeds.up / 1024 / 1024,
        downSpeedLabel: formatBytesPerSecond(speeds.down),
        upSpeedLabel: formatBytesPerSecond(speeds.up),
        serverState: data.server_state || {},
        torrents: torrentList,
      });
    } catch (error) {
      return NextResponse.json(qbittorrentError(error), { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
