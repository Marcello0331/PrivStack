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
    const connection = connectionId ? getServiceConnection(Number(connectionId), 'plex') : undefined;
    const plexUrl = connection?.url || getSetting('plex_url') || process.env.PLEX_URL;
    const plexToken = connection?.token || getSetting('plex_token') || process.env.PLEX_TOKEN;

    if (!plexUrl || !plexToken) {
      return NextResponse.json({ error: 'not_configured' });
    }

    return NextResponse.json({
      activeStreams: 0,
      status: 'Ready',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
