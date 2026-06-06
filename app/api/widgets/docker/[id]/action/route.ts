import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/config';
import { formatDockerError, getDockerClient } from '@/lib/dockerClient';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS = new Set(['start', 'stop', 'restart']);

function isAdmin(session: any) {
  return session?.user?.role === 'admin';
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = String(body.action || '').trim();

    if (!ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }

    try {
      const docker = getDockerClient();
      const container = docker.getContainer(params.id);

      if (action === 'start') await container.start();
      if (action === 'stop') await container.stop();
      if (action === 'restart') await container.restart();

      return NextResponse.json({ success: true, action });
    } catch (error) {
      const formatted = formatDockerError(error);
      const status = formatted.error === 'container_not_found' ? 404 : 503;
      return NextResponse.json(formatted, { status });
    }
  } catch (error) {
    console.error('Docker action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
