import { getServiceConnection } from '@/lib/serviceConnections';
import { getSetting } from '@/lib/settings';

export interface QbittorrentConfig {
  url: string;
  username?: string;
  password?: string;
}

export interface QbittorrentSession {
  request: (pathname: string, init?: RequestInit) => Promise<Response>;
}

function normalizeBaseUrl(url: string) {
  return new URL(url).toString().replace(/\/$/, '');
}

function parseExtraJson(value?: string | null) {
  if (!value) return {};

  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

export function resolveQbittorrentConfig(connectionId: string | null): QbittorrentConfig | null {
  const connection = connectionId ? getServiceConnection(Number(connectionId), 'qbittorrent') : undefined;
  const extra = parseExtraJson(connection?.extra_json);
  const url = connection?.url || getSetting('qbittorrent_url') || process.env.QBITTORRENT_URL;

  if (!url) return null;

  return {
    url,
    username: extra.username || getSetting('qbittorrent_username') || process.env.QBITTORRENT_USERNAME,
    password: extra.password || getSetting('qbittorrent_password') || process.env.QBITTORRENT_PASSWORD,
  };
}

export async function createQbittorrentSession(config: QbittorrentConfig): Promise<QbittorrentSession> {
  const baseUrl = normalizeBaseUrl(config.url);
  let cookie = '';

  if (config.username || config.password) {
    const body = new URLSearchParams({
      username: config.username || '',
      password: config.password || '',
    });
    const response = await fetch(`${baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });
    const text = await response.text();

    if (!response.ok || !text.includes('Ok.')) {
      throw new Error('auth_failed');
    }

    cookie = response.headers.get('set-cookie')?.split(';')[0] || '';
  }

  return {
    request: (pathname, init = {}) => (
      fetch(`${baseUrl}${pathname}`, {
        ...init,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(init.headers || {}),
        },
        cache: 'no-store',
      })
    ),
  };
}

export function qbittorrentError(error: unknown) {
  if (error instanceof Error && error.message === 'auth_failed') {
    return { error: 'auth_failed', message: 'qBittorrent authentication failed.' };
  }

  if (error instanceof TypeError) {
    return { error: 'unreachable', message: 'qBittorrent is unreachable from the server.' };
  }

  return { error: 'unreachable', message: 'Unable to reach qBittorrent.' };
}
