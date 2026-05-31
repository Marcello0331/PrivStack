import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const qbitUrl = getSetting('qbittorrent_url') || process.env.QBITTORRENT_URL;

    if (!qbitUrl) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const response = await fetch(`${qbitUrl}/api/v2/sync/maindata`);
      if (!response.ok) {
        return NextResponse.json({ error: 'unreachable' });
      }

      const data = await response.json();
      const torrents = data.torrents || {};

      const active = Object.values(torrents).filter((t: any) => t.state === 'downloading').length;
      const speeds = Object.values(torrents).reduce(
        (acc: { down: number; up: number }, t: any) => ({
          down: acc.down + (t.dl_speed || 0),
          up: acc.up + (t.up_speed || 0),
        }),
        { down: 0, up: 0 }
      );

      return NextResponse.json({
        activeTorrents: active,
        totalTorrents: Object.keys(torrents).length,
        downSpeed: speeds.down / 1024 / 1024,
        upSpeed: speeds.up / 1024 / 1024,
      });
    } catch {
      return NextResponse.json({ error: 'unreachable' });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
