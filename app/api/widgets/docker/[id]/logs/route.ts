import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/config';
import { formatDockerError, getDockerClient } from '@/lib/dockerClient';

export const dynamic = 'force-dynamic';

function cleanDockerLogs(value: Buffer) {
  return value
    .toString('utf8')
    .replace(/\u0000/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestedTail = Number(new URL(request.url).searchParams.get('tail') || 200);
    const tail = Math.min(Math.max(Number.isFinite(requestedTail) ? requestedTail : 200, 1), 1000);

    try {
      const docker = getDockerClient();
      const container = docker.getContainer(params.id);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });

      return NextResponse.json({ logs: cleanDockerLogs(Buffer.from(logs)) });
    } catch (error) {
      const formatted = formatDockerError(error);
      const status = formatted.error === 'container_not_found' ? 404 : 503;
      return NextResponse.json(formatted, { status });
    }
  } catch (error) {
    console.error('Docker logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
