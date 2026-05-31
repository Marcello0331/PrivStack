import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getSetting } from '@/lib/settings';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const glancesUrl = getSetting('glances_url') || process.env.GLANCES_URL || 'http://192.168.0.131:61208';

    try {
      const response = await fetch(`${glancesUrl}/api/3/`);
      if (!response.ok) {
        return NextResponse.json({
          cpu: 0,
          memory: { used: 0, total: 0 },
          disk: { used: 0, total: 0 },
          network: { down: 0, up: 0 },
        });
      }

      const data: any = await response.json();

      return NextResponse.json({
        cpu: data.cpu || 0,
        memory: {
          used: (data.mem?.[1] || 0) / 1024 / 1024 / 1024,
          total: (data.mem?.[0] || 0) / 1024 / 1024 / 1024,
        },
        disk: {
          used: (data.fs?.[0]?.used || 0) / 1024 / 1024 / 1024,
          total: (data.fs?.[0]?.size || 0) / 1024 / 1024 / 1024,
        },
        network: {
          down: data.net_io?.[0] || 0,
          up: data.net_io?.[1] || 0,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Glances unavailable' }, { status: 503 });
    }
  } catch (error) {
    console.error('System stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
