import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { formatDockerError, getDockerClient, normalizeContainer } from '@/lib/dockerClient';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const docker = getDockerClient();
      const containers = await docker.listContainers({ all: true });

      return NextResponse.json({ containers: containers.map(normalizeContainer) });
    } catch (error) {
      return NextResponse.json({ containers: [], ...formatDockerError(error) }, { status: 503 });
    }
  } catch (error) {
    console.error('Docker widget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
