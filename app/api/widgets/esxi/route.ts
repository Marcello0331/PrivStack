import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getSetting } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const esxiUrl = getSetting('esxi_url') || process.env.ESXI_URL;

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
