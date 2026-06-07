import getDb from '@/lib/db';
import { getDockerClient, normalizeContainer } from '@/lib/dockerClient';

export interface DiscoveredApp {
  name: string;
  url: string;
  icon_url: string;
  description: string;
  category: string;
  open_in: 'tab';
  pinned: boolean;
  source: 'privstack-labels' | 'homepage-labels' | 'homarr-labels' | 'traefik-labels' | 'published-port';
  containerName: string;
  confidence: 'high' | 'medium' | 'low';
  duplicate?: boolean;
}

function firstLabel(labels: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = labels[key];
    if (value) return value;
  }
  return '';
}

function normalizeHostRule(value: string) {
  const match = value.match(/Host\(`([^`]+)`\)/) || value.match(/Host\("([^"]+)"\)/);
  return match?.[1] || '';
}

function normalizeUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `http://${value}`;
}

function iconForName(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${slug}.png` : '';
}

function normalizeIcon(value: string, fallbackName: string) {
  if (!value) return iconForName(fallbackName);
  if (/^https?:\/\//i.test(value)) return value;

  const cleaned = value
    .replace(/^selfhst\//, '')
    .replace(/^https?:\/\//i, '')
    .replace(/^\/+/, '')
    .replace(/\.(png|svg|webp)$/i, '');
  const slug = cleaned.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return slug ? `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${slug}.png` : iconForName(fallbackName);
}

function discoveryHost() {
  if (process.env.DOCKER_DISCOVERY_HOST) return process.env.DOCKER_DISCOVERY_HOST;
  if (process.env.NEXTAUTH_URL) {
    try {
      return new URL(process.env.NEXTAUTH_URL).hostname;
    } catch {
      return 'localhost';
    }
  }
  return 'localhost';
}

function publishedPort(port: string) {
  const match = port.match(/:(\d+)->/) || port.match(/^(\d+)->/);
  return match?.[1] || '';
}

function appFromLabels(container: ReturnType<typeof normalizeContainer>): DiscoveredApp | null {
  const labels = container.labels;
  const privstackUrl = firstLabel(labels, ['privstack.url', 'privstack.href']);
  if (privstackUrl) {
    const name = firstLabel(labels, ['privstack.name']) || container.name;
    return {
      name,
      url: normalizeUrl(privstackUrl),
      icon_url: normalizeIcon(firstLabel(labels, ['privstack.icon', 'privstack.icon_url']), name),
      description: firstLabel(labels, ['privstack.description']) || `Discovered from ${container.name}`,
      category: firstLabel(labels, ['privstack.category', 'privstack.group']) || 'Docker',
      open_in: 'tab',
      pinned: true,
      source: 'privstack-labels',
      containerName: container.name,
      confidence: 'high',
    };
  }

  const homepageUrl = firstLabel(labels, ['homepage.href']);
  if (homepageUrl) {
    const name = firstLabel(labels, ['homepage.name']) || container.name;
    return {
      name,
      url: normalizeUrl(homepageUrl),
      icon_url: normalizeIcon(firstLabel(labels, ['homepage.icon']), name),
      description: firstLabel(labels, ['homepage.description']) || `Discovered from ${container.name}`,
      category: firstLabel(labels, ['homepage.group']) || 'Docker',
      open_in: 'tab',
      pinned: true,
      source: 'homepage-labels',
      containerName: container.name,
      confidence: 'high',
    };
  }

  const homarrUrl = firstLabel(labels, ['homarr.url', 'homarr.href']);
  if (homarrUrl) {
    const name = firstLabel(labels, ['homarr.name']) || container.name;
    return {
      name,
      url: normalizeUrl(homarrUrl),
      icon_url: normalizeIcon(firstLabel(labels, ['homarr.icon']), name),
      description: firstLabel(labels, ['homarr.description']) || `Discovered from ${container.name}`,
      category: firstLabel(labels, ['homarr.category', 'homarr.group']) || 'Docker',
      open_in: 'tab',
      pinned: true,
      source: 'homarr-labels',
      containerName: container.name,
      confidence: 'high',
    };
  }

  const traefikRule = Object.entries(labels).find(([key, value]) => (
    key.startsWith('traefik.http.routers.') && key.endsWith('.rule') && value.includes('Host(')
  ));
  if (traefikRule) {
    const host = normalizeHostRule(traefikRule[1]);
    if (host) {
      return {
        name: container.name,
        url: `https://${host}`,
        icon_url: iconForName(container.name),
        description: `Discovered from ${container.name}`,
        category: 'Docker',
        open_in: 'tab',
        pinned: true,
        source: 'traefik-labels',
        containerName: container.name,
        confidence: 'medium',
      };
    }
  }

  const publicPort = container.ports.find((port) => port.includes('->'));
  const port = publicPort ? publishedPort(publicPort) : '';
  if (port) {
    return {
      name: container.name,
      url: `http://${discoveryHost()}:${port}`,
      icon_url: iconForName(container.name),
      description: `Published port from ${container.name}`,
      category: 'Docker',
      open_in: 'tab',
      pinned: true,
      source: 'published-port',
      containerName: container.name,
      confidence: 'low',
    };
  }

  return null;
}

function applyDuplicateFlags(apps: DiscoveredApp[]) {
  const db = getDb();
  const existing = db.prepare('SELECT lower(name) as name, lower(url) as url FROM apps').all() as Array<{ name: string; url: string }>;
  const existingNames = new Set(existing.map((app) => app.name));
  const existingUrls = new Set(existing.map((app) => app.url));

  return apps.map((app) => ({
    ...app,
    duplicate: existingNames.has(app.name.toLowerCase()) || existingUrls.has(app.url.toLowerCase()),
  }));
}

export async function discoverDockerApps() {
  const docker = getDockerClient();
  const containers = await docker.listContainers({ all: false });
  const discovered = containers
    .map((container) => appFromLabels(normalizeContainer(container)))
    .filter((app): app is DiscoveredApp => Boolean(app));

  return applyDuplicateFlags(discovered);
}

export function importDiscoveredApps(apps: DiscoveredApp[]) {
  const db = getDb();
  const existing = db.prepare('SELECT lower(name) as name, lower(url) as url FROM apps').all() as Array<{ name: string; url: string }>;
  const existingNames = new Set(existing.map((app) => app.name));
  const existingUrls = new Set(existing.map((app) => app.url));
  const insert = db.prepare(
    'INSERT INTO apps (name, url, icon_url, description, category, open_in, pinned) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  let imported = 0;
  let skipped = 0;

  for (const app of apps) {
    const nameKey = app.name.toLowerCase();
    const urlKey = app.url.toLowerCase();
    if (existingNames.has(nameKey) || existingUrls.has(urlKey)) {
      skipped += 1;
      continue;
    }

    insert.run(app.name, app.url, app.icon_url || '', app.description || '', app.category || 'Docker', 'tab', app.pinned ? 1 : 0);
    existingNames.add(nameKey);
    existingUrls.add(urlKey);
    imported += 1;
  }

  return { imported, skipped };
}
