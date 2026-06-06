import { getServiceConnection } from '@/lib/serviceConnections';
import { getSetting } from '@/lib/settings';

export type ServarrType = 'radarr' | 'sonarr' | 'prowlarr';

export interface ServarrConfig {
  type: ServarrType;
  url: string;
  apiKey: string;
}

const ENV_KEYS: Record<ServarrType, { url: string; key: string }> = {
  prowlarr: { url: 'PROWLARR_URL', key: 'PROWLARR_API_KEY' },
  radarr: { url: 'RADARR_URL', key: 'RADARR_API_KEY' },
  sonarr: { url: 'SONARR_URL', key: 'SONARR_API_KEY' },
};

function normalizeBaseUrl(url: string) {
  return new URL(url).toString().replace(/\/$/, '');
}

export function resolveServarrConfig(type: ServarrType, connectionId: string | null): ServarrConfig | null {
  const connection = connectionId ? getServiceConnection(Number(connectionId), type) : undefined;
  const env = ENV_KEYS[type];
  const url = connection?.url || getSetting(`${type}_url`) || process.env[env.url];
  const apiKey = connection?.api_key || getSetting(`${type}_api_key`) || process.env[env.key];

  if (!url || !apiKey) return null;

  return {
    type,
    url,
    apiKey,
  };
}

export async function servarrFetch(config: ServarrConfig, pathname: string, init: RequestInit = {}) {
  return fetch(`${normalizeBaseUrl(config.url)}${pathname}`, {
    ...init,
    headers: {
      'X-Api-Key': config.apiKey,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

export async function servarrJson<T>(config: ServarrConfig, pathname: string, init?: RequestInit) {
  const response = await servarrFetch(config, pathname, init);

  if (response.status === 401 || response.status === 403) {
    throw new Error('auth_failed');
  }

  if (!response.ok) {
    throw new Error('unreachable');
  }

  return response.json() as Promise<T>;
}

export function servarrError(error: unknown) {
  if (error instanceof Error && error.message === 'auth_failed') {
    return { error: 'auth_failed', message: 'Service API key was rejected.' };
  }

  return { error: 'unreachable', message: 'Service is unreachable from the server.' };
}

export function normalizeQueueResponse(value: any) {
  if (Array.isArray(value)) {
    return { records: value, totalRecords: value.length };
  }

  return {
    records: Array.isArray(value?.records) ? value.records : [],
    totalRecords: typeof value?.totalRecords === 'number' ? value.totalRecords : 0,
  };
}

export function normalizeQueueItem(item: any) {
  return {
    id: item.id,
    title: item.title || item.movie?.title || item.series?.title || 'Unknown',
    status: item.status || item.trackedDownloadStatus || 'unknown',
    protocol: item.protocol || '',
    size: item.size || item.sizeleft || 0,
    sizeLeft: item.sizeleft || 0,
    timeLeft: item.timeleft || item.estimatedCompletionTime || '',
    downloadClient: item.downloadClient || '',
  };
}
