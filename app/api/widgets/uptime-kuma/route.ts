import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import { getSetting } from '@/lib/settings';
import { getServiceConnection } from '@/lib/serviceConnections';

export const dynamic = 'force-dynamic';

interface KumaMonitor {
  id: number | string;
  name: string;
  type?: string;
  url?: string;
  groupName?: string;
}

interface KumaHeartbeat {
  status: number;
  time?: string;
  ping?: number | null;
  msg?: string;
}

interface KumaPublicGroup {
  name?: string;
  monitorList?: Array<{
    id: number | string;
    name?: string;
    type?: string;
    url?: string;
  }>;
}

interface KumaStatusPageResponse {
  title?: string;
  publicGroupList?: KumaPublicGroup[];
}

interface KumaHeartbeatResponse {
  heartbeatList?: Record<string, KumaHeartbeat[]>;
  uptimeList?: Record<string, number>;
}

interface NormalizedMonitor extends KumaMonitor {
  status: 'up' | 'down' | 'maintenance' | 'unknown';
  ping: number | null;
  uptime: number | null;
  heartbeats: KumaHeartbeat[];
  lastChecked: string | null;
}

function normalizeBaseUrl(url: string) {
  const parsed = new URL(url);
  return parsed.toString().replace(/\/$/, '');
}

function statusFromHeartbeat(status?: number): NormalizedMonitor['status'] {
  if (status === 1) return 'up';
  if (status === 0) return 'down';
  if (status === 3) return 'maintenance';
  return 'unknown';
}

function flattenMonitors(groups: KumaPublicGroup[]): KumaMonitor[] {
  return groups.flatMap((group) => (
    Array.isArray(group.monitorList)
      ? group.monitorList.map((monitor) => ({
          id: monitor.id,
          name: monitor.name || `Monitor ${monitor.id}`,
          type: monitor.type,
          url: monitor.url,
          groupName: group.name,
        }))
      : []
  ));
}

function latestHeartbeat(heartbeats: KumaHeartbeat[]) {
  return [...heartbeats].sort((a, b) => (
    new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime()
  ))[0];
}

function calculateUptime(heartbeats: KumaHeartbeat[]) {
  if (!heartbeats.length) return null;

  const known = heartbeats.filter((heartbeat) => heartbeat.status === 0 || heartbeat.status === 1);
  if (!known.length) return null;

  const up = known.filter((heartbeat) => heartbeat.status === 1).length;
  return Math.round((up / known.length) * 1000) / 10;
}

function uptimeFromList(uptimeList: Record<string, number> | undefined, monitorId: number | string) {
  if (!uptimeList) return null;

  const matchingKey = Object.keys(uptimeList).find((key) => (
    key === String(monitorId) || key.startsWith(`${monitorId}_`)
  ));

  const value = matchingKey ? uptimeList[matchingKey] : null;
  return typeof value === 'number' ? Math.round(value * 1000) / 10 : null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const configuredUrl = searchParams.get('url')?.trim();
    const connectionId = searchParams.get('connectionId');
    const connection = connectionId ? getServiceConnection(Number(connectionId), 'uptime-kuma') : undefined;
    const uptimeUrl = connection?.url || configuredUrl || getSetting('uptime_kuma_url') || process.env.UPTIME_KUMA_URL;
    const slug = searchParams.get('slug')?.trim() || 'default';
    const selected = searchParams.get('monitors');
    const selectedMonitors = selected
      ? selected.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean)
      : null;

    if (!uptimeUrl) {
      return NextResponse.json({ error: 'not_configured' });
    }

    let baseUrl: string;
    try {
      baseUrl = normalizeBaseUrl(uptimeUrl);
    } catch {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
    }

    try {
      const [statusResponse, heartbeatResponse] = await Promise.all([
        fetch(`${baseUrl}/api/status-page/${encodeURIComponent(slug)}`, { cache: 'no-store' }),
        fetch(`${baseUrl}/api/status-page/heartbeat/${encodeURIComponent(slug)}`, { cache: 'no-store' }),
      ]);

      if (statusResponse.status === 404 || heartbeatResponse.status === 404) {
        return NextResponse.json({ error: 'bad_slug', slug }, { status: 404 });
      }

      if (!statusResponse.ok || !heartbeatResponse.ok) {
        return NextResponse.json({ error: 'unreachable' }, { status: 502 });
      }

      const statusPage = await statusResponse.json() as KumaStatusPageResponse;
      const heartbeatData = await heartbeatResponse.json() as KumaHeartbeatResponse;
      const heartbeatList = heartbeatData.heartbeatList || {};
      const uptimeList = heartbeatData.uptimeList;
      const monitors = flattenMonitors(statusPage.publicGroupList || [])
        .filter((monitor) => {
          if (!selectedMonitors) return true;
          return selectedMonitors.includes(String(monitor.id).toLowerCase())
            || selectedMonitors.includes(monitor.name.toLowerCase());
        })
        .map((monitor) => {
          const rawHeartbeats = Array.isArray(heartbeatList[String(monitor.id)]) ? heartbeatList[String(monitor.id)] : [];
          const heartbeats = [...rawHeartbeats]
            .sort((a, b) => new Date(a.time || 0).getTime() - new Date(b.time || 0).getTime())
            .slice(-60);
          const latest = latestHeartbeat(heartbeats);
          const uptime = uptimeFromList(uptimeList, monitor.id) ?? calculateUptime(heartbeats);

          return {
            ...monitor,
            status: statusFromHeartbeat(latest?.status),
            ping: typeof latest?.ping === 'number' ? latest.ping : null,
            uptime,
            heartbeats,
            lastChecked: latest?.time || null,
          };
        }) as NormalizedMonitor[];

      const summary = monitors.reduce(
        (counts, monitor) => ({
          ...counts,
          [monitor.status]: counts[monitor.status] + 1,
          total: counts.total + 1,
        }),
        { up: 0, down: 0, maintenance: 0, unknown: 0, total: 0 } as Record<NormalizedMonitor['status'] | 'total', number>
      );

      return NextResponse.json({
        title: statusPage.title || 'Uptime Kuma',
        slug,
        statusPageUrl: `${baseUrl}/status/${encodeURIComponent(slug)}`,
        monitors,
        summary,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json({ error: 'unreachable' }, { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
