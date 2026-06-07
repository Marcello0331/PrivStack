import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { getDockerClient } from '@/lib/dockerClient';
import { createQbittorrentSession, resolveQbittorrentConfig } from '@/lib/serviceClients/qbittorrent';
import { normalizeQueueResponse, resolveServarrConfig, servarrJson } from '@/lib/serviceClients/servarr';

export const dynamic = 'force-dynamic';

function formatDuration(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

async function getDockerStats(warnings: string[]) {
  try {
    const containers = await getDockerClient().listContainers({ all: true });
    return {
      containers: containers.length,
      runningContainers: containers.filter((container: any) => container.State === 'running').length,
    };
  } catch {
    warnings.push('Docker unavailable');
    return { containers: null, runningContainers: null };
  }
}

async function getTorrentStats(warnings: string[]) {
  const config = resolveQbittorrentConfig(null);
  if (!config) return { torrents: null, activeTorrents: null };

  try {
    const client = await createQbittorrentSession(config);
    const response = await client.request('/api/v2/sync/maindata');
    if (!response.ok) throw new Error('unreachable');

    const data = await response.json();
    const torrents = Object.values(data.torrents || {}) as any[];
    return {
      torrents: torrents.length,
      activeTorrents: torrents.filter((torrent) => ['downloading', 'uploading', 'stalledDL', 'stalledUP'].includes(torrent.state)).length,
    };
  } catch {
    warnings.push('qBittorrent unavailable');
    return { torrents: null, activeTorrents: null };
  }
}

async function getQueueSize(type: 'sonarr' | 'radarr', warnings: string[]) {
  const config = resolveServarrConfig(type, null);
  if (!config) return null;

  try {
    const data = await servarrJson<any>(config, '/api/v3/queue?page=1&pageSize=1');
    return normalizeQueueResponse(data).totalRecords;
  } catch {
    warnings.push(`${type} unavailable`);
    return null;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const warnings: string[] = [];
    const [docker, torrents, sonarrQueue, radarrQueue] = await Promise.all([
      getDockerStats(warnings),
      getTorrentStats(warnings),
      getQueueSize('sonarr', warnings),
      getQueueSize('radarr', warnings),
    ]);

    return NextResponse.json({
      uptime: formatDuration(process.uptime()),
      containers: docker.containers,
      runningContainers: docker.runningContainers,
      torrents: torrents.torrents,
      activeTorrents: torrents.activeTorrents,
      sonarrQueue,
      radarrQueue,
      warnings,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
