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

    const plexUrl = getSetting('plex_url') || process.env.PLEX_URL;
    const plexToken = getSetting('plex_token') || process.env.PLEX_TOKEN;

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
