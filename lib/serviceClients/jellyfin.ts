import { getServiceConnection } from '@/lib/serviceConnections';
import { getSetting } from '@/lib/settings';

export interface JellyfinConfig {
  url: string;
  apiKey: string;
}

function normalizeBaseUrl(url: string) {
  return new URL(url).toString().replace(/\/$/, '');
}

export function resolveJellyfinConfig(connectionId: string | null): JellyfinConfig | null {
  const connection = connectionId ? getServiceConnection(Number(connectionId), 'jellyfin') : undefined;
  const url = connection?.url || getSetting('jellyfin_url') || process.env.JELLYFIN_URL;
  const apiKey = connection?.api_key || getSetting('jellyfin_api_key') || process.env.JELLYFIN_API_KEY;

  if (!url || !apiKey) return null;

  return { url, apiKey };
}

export async function jellyfinFetch(config: JellyfinConfig, pathname: string, init: RequestInit = {}) {
  return fetch(`${normalizeBaseUrl(config.url)}${pathname}`, {
    ...init,
    headers: {
      'X-Emby-Token': config.apiKey,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

export async function jellyfinJson<T>(config: JellyfinConfig, pathname: string, init?: RequestInit) {
  const response = await jellyfinFetch(config, pathname, init);

  if (response.status === 401 || response.status === 403) {
    throw new Error('auth_failed');
  }

  if (!response.ok) {
    throw new Error('unreachable');
  }

  return response.json() as Promise<T>;
}

export function jellyfinError(error: unknown) {
  if (error instanceof Error && error.message === 'auth_failed') {
    return { error: 'auth_failed', message: 'Jellyfin API key was rejected.' };
  }

  return { error: 'unreachable', message: 'Jellyfin is unreachable from the server.' };
}
