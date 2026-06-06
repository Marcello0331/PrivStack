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

function normalizeMovie(movie: any) {
  return {
    id: movie.id,
    title: movie.title || 'Unknown',
    year: movie.year,
    monitored: Boolean(movie.monitored),
    hasFile: Boolean(movie.hasFile),
    added: movie.added || null,
    path: movie.path || '',
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = new URL(request.url).searchParams.get('connectionId');
    const config = resolveServarrConfig('radarr', connectionId);

    if (!config) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const [movies, queueData, missingData] = await Promise.all([
        servarrJson<any[]>(config, '/api/v3/movie'),
        servarrJson<any>(config, '/api/v3/queue?page=1&pageSize=12&sortKey=timeleft&sortDirection=ascending'),
        servarrJson<any>(config, '/api/v3/wanted/missing?page=1&pageSize=1'),
      ]);

      const queue = normalizeQueueResponse(queueData);
      const recent = [...movies]
        .sort((a, b) => new Date(b.added || 0).getTime() - new Date(a.added || 0).getTime())
        .slice(0, 8)
        .map(normalizeMovie);

      return NextResponse.json({
        movieCount: movies.length,
        missingCount: movies.filter((m: any) => !m.hasFile).length,
        wantedCount: missingData?.totalRecords || movies.filter((m: any) => !m.hasFile).length,
        monitoredCount: movies.filter((m: any) => m.monitored).length,
        queueSize: queue.totalRecords,
        queue: queue.records.map(normalizeQueueItem),
        recent,
      });
    } catch (error) {
      return NextResponse.json(servarrError(error), { status: 502 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
