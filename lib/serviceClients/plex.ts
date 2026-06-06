import { getServiceConnection } from '@/lib/serviceConnections';
import { getSetting } from '@/lib/settings';

export interface PlexConfig {
  url: string;
  token: string;
}

function normalizeBaseUrl(url: string) {
  return new URL(url).toString().replace(/\/$/, '');
}

export function resolvePlexConfig(connectionId: string | null): PlexConfig | null {
  const connection = connectionId ? getServiceConnection(Number(connectionId), 'plex') : undefined;
  const url = connection?.url || getSetting('plex_url') || process.env.PLEX_URL;
  const token = connection?.token || getSetting('plex_token') || process.env.PLEX_TOKEN;

  if (!url || !token) return null;

  return { url, token };
}

export async function plexFetch(config: PlexConfig, pathname: string, init: RequestInit = {}) {
  const separator = pathname.includes('?') ? '&' : '?';

  return fetch(`${normalizeBaseUrl(config.url)}${pathname}${separator}X-Plex-Token=${encodeURIComponent(config.token)}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
}

export async function plexJson<T>(config: PlexConfig, pathname: string, init?: RequestInit) {
  const response = await plexFetch(config, pathname, init);

  if (response.status === 401 || response.status === 403) {
    throw new Error('auth_failed');
  }

  if (!response.ok) {
    throw new Error('unreachable');
  }

  return response.json() as Promise<T>;
}

export function plexError(error: unknown) {
  if (error instanceof Error && error.message === 'auth_failed') {
    return { error: 'auth_failed', message: 'Plex token was rejected.' };
  }

  return { error: 'unreachable', message: 'Plex is unreachable from the server.' };
}
