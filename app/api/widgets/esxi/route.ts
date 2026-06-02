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
    const connection = connectionId ? getServiceConnection(Number(connectionId), 'esxi') : undefined;
    const esxiUrl = connection?.url || getSetting('esxi_url') || process.env.ESXI_URL;

    if (!esxiUrl) {
      return NextResponse.json({ error: 'not_configured' });
    }

    return NextResponse.json({
      vmCount: 0,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
