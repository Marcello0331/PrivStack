import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/config';
import {
  resolveServarrConfig,
  servarrError,
  servarrJson,
} from '@/lib/serviceClients/servarr';

export const dynamic = 'force-dynamic';

function normalizeIndexer(indexer: any) {
  return {
    id: indexer.id,
    name: indexer.name || 'Unknown',
    implementation: indexer.implementationName || indexer.implementation || '',
    protocol: indexer.protocol || '',
    privacy: indexer.privacy || '',
    enable: Boolean(indexer.enable),
    appProfileId: indexer.appProfileId || null,
    priority: indexer.priority || 0,
    tags: Array.isArray(indexer.tags) ? indexer.tags : [],
  };
}

function normalizeApplication(app: any) {
  return {
    id: app.id,
    name: app.name || app.implementationName || 'Unknown',
    implementation: app.implementationName || app.implementation || '',
    syncLevel: app.syncLevel || '',
    enable: app.enable !== false,
  };
}

function normalizeHealth(item: any) {
  return {
    source: item.source || 'Prowlarr',
    type: item.type || 'unknown',
    message: item.message || item.wikiUrl || 'Health issue',
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectionId = new URL(request.url).searchParams.get('connectionId');
    const config = resolveServarrConfig('prowlarr', connectionId);

    if (!config) {
      return NextResponse.json({ error: 'not_configured' });
    }

    try {
      const [indexers, applications, health, status] = await Promise.all([
        servarrJson<any[]>(config, '/api/v1/indexer'),
        servarrJson<any[]>(config, '/api/v1/applications'),
        servarrJson<any[]>(config, '/api/v1/health'),
        servarrJson<any>(config, '/api/v1/system/status'),
      ]);

      const normalizedIndexers = indexers.map(normalizeIndexer);
      const normalizedApps = applications.map(normalizeApplication);
      const enabledIndexers = normalizedIndexers.filter((indexer) => indexer.enable).length;

      return NextResponse.json({
        version: status?.version || '',
        indexerCount: normalizedIndexers.length,
        enabledIndexerCount: enabledIndexers,
        disabledIndexerCount: normalizedIndexers.length - enabledIndexers,
        appCount: normalizedApps.length,
        healthCount: health.length,
        indexers: normalizedIndexers,
        applications: normalizedApps,
        health: health.map(normalizeHealth),
      });
    } catch (error) {
      return NextResponse.json(servarrError(error), { status: 502 });
    }
  } catch (error) {
    console.error('Prowlarr widget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
