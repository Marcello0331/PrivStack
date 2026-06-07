import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/config';
import { discoverDockerApps } from '@/lib/dockerDiscovery';
import { formatDockerError } from '@/lib/dockerClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const apps = await discoverDockerApps();
      return NextResponse.json({ apps, warnings: [] });
    } catch (error) {
      return NextResponse.json({ apps: [], warnings: [formatDockerError(error)] }, { status: 503 });
    }
  } catch (error) {
    console.error('Docker discovery error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
