import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { getSetting } from '@/lib/settings';
import { getServiceConnection } from '@/lib/serviceConnections';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = new URL(request.url).searchParams.get('connectionId');
    const connection = connectionId ? getServiceConnection(Number(connectionId), 'radarr') : undefined;
    const radarrUrl = connection?.url || getSetting('radarr_url') || process.env.RADARR_URL;
    const radarrKey = connection?.api_key || getSetting('radarr_api_key') || process.env.RADARR_API_KEY;

    if (!radarrUrl || !radarrKey) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const [moviesRes, queueRes] = await Promise.all([
        fetch(`${radarrUrl}/api/v3/movie`, {
          headers: { 'X-Api-Key': radarrKey },
        }),
        fetch(`${radarrUrl}/api/v3/queue`, {
          headers: { 'X-Api-Key': radarrKey },
        }),
      ]);

      if (!moviesRes.ok || !queueRes.ok) {
        return NextResponse.json({ error: 'auth_failed' });
      }

      const movies = await moviesRes.json();
      const queue = await queueRes.json();

      return NextResponse.json({
        movieCount: movies.length,
        missingCount: movies.filter((m: any) => !m.hasFile).length,
        queueSize: queue.length,
      });
    } catch {
      return NextResponse.json({ error: 'unreachable' });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
