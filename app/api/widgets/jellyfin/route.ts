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
    const connection = connectionId ? getServiceConnection(Number(connectionId), 'jellyfin') : undefined;
    const jellyfinUrl = connection?.url || getSetting('jellyfin_url') || process.env.JELLYFIN_URL;
    const jellyfinKey = connection?.api_key || getSetting('jellyfin_api_key') || process.env.JELLYFIN_API_KEY;

    if (!jellyfinUrl || !jellyfinKey) {
      return NextResponse.json({ error: 'not_configured' });
    }

    return NextResponse.json({
      activeSessions: 0,
      recentlyAdded: 0,
      movieCount: 0,
      showCount: 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
