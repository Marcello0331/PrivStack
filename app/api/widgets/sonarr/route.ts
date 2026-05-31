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

    const sonarrUrl = getSetting('sonarr_url') || process.env.SONARR_URL;
    const sonarrKey = getSetting('sonarr_api_key') || process.env.SONARR_API_KEY;

    if (!sonarrUrl || !sonarrKey) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const [seriesRes, queueRes] = await Promise.all([
        fetch(`${sonarrUrl}/api/v3/series`, {
          headers: { 'X-Api-Key': sonarrKey },
        }),
        fetch(`${sonarrUrl}/api/v3/queue`, {
          headers: { 'X-Api-Key': sonarrKey },
        }),
      ]);

      if (!seriesRes.ok || !queueRes.ok) {
        return NextResponse.json({ error: 'auth_failed' });
      }

      const series = await seriesRes.json();
      const queue = await queueRes.json();

      return NextResponse.json({
        seriesCount: series.length,
        queueSize: queue.length,
        lastAdded: series[0]?.title || 'N/A',
      });
    } catch {
      return NextResponse.json({ error: 'unreachable' });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
