import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { getSetting } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uptimeUrl = getSetting('uptime_kuma_url') || process.env.UPTIME_KUMA_URL;

    if (!uptimeUrl) {
      return NextResponse.json({ error: 'not_configured' });
    }

    return NextResponse.json({
      upCount: 0,
      downCount: 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
