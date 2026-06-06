import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import {
  normalizeQueueItem,
  normalizeQueueResponse,
  resolveServarrConfig,
  servarrError,
  servarrJson,
} from '@/lib/serviceClients/servarr';

export const dynamic = 'force-dynamic';

function normalizeSeries(series: any) {
  return {
    id: series.id,
    title: series.title || 'Unknown',
    year: series.year,
    monitored: Boolean(series.monitored),
    seasonCount: Array.isArray(series.seasons) ? series.seasons.length : 0,
    added: series.added || null,
    path: series.path || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = new URL(request.url).searchParams.get('connectionId');
    const config = resolveServarrConfig('sonarr', connectionId);

    if (!config) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const [series, queueData, missingData] = await Promise.all([
        servarrJson<any[]>(config, '/api/v3/series'),
        servarrJson<any>(config, '/api/v3/queue?page=1&pageSize=12&sortKey=timeleft&sortDirection=ascending'),
        servarrJson<any>(config, '/api/v3/wanted/missing?page=1&pageSize=1'),
      ]);

      const queue = normalizeQueueResponse(queueData);
      const recent = [...series]
        .sort((a, b) => new Date(b.added || 0).getTime() - new Date(a.added || 0).getTime())
        .slice(0, 8)
        .map(normalizeSeries);

      return NextResponse.json({
        seriesCount: series.length,
        monitoredCount: series.filter((item: any) => item.monitored).length,
        wantedCount: missingData?.totalRecords || 0,
        queueSize: queue.totalRecords,
        queue: queue.records.map(normalizeQueueItem),
        recent,
        lastAdded: recent[0]?.title || 'N/A',
      });
    } catch (error) {
      return NextResponse.json(servarrError(error), { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
