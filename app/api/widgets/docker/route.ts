import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const Docker = require('dockerode');
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      const containers = await docker.listContainers({ all: true });

      const formatted = containers.map((container: any) => ({
        id: container.Id.substring(0, 12),
        name: container.Names[0]?.replace(/^\//, '') || 'unknown',
        image: container.Image,
        state: container.State,
        status: container.Status,
        uptime: container.Status.split(' ').slice(-2).join(' '),
      }));

      return NextResponse.json({ containers: formatted });
    } catch {
      return NextResponse.json({
        containers: [],
      });
    }
  } catch (error) {
    console.error('Docker widget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
