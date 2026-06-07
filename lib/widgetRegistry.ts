import { Activity, HardDrive, Download, Play, Cloud, Wind, Server, Grid3x3, Search, Gauge, BarChart3, FileText } from 'lucide-react';

export interface WidgetConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  defaultSize: { w: number; h: number };
  configurable: boolean;
}

const widgets: WidgetConfig[] = [
  {
    id: 'system-stats',
    name: 'System Stats',
    description: 'CPU, RAM, disk usage from Glances',
    icon: Gauge,
    defaultSize: { w: 4, h: 3 },
    configurable: false,
  },
  {
    id: 'docker-containers',
    name: 'Docker Containers',
    description: 'Running Docker containers',
    icon: HardDrive,
    defaultSize: { w: 5, h: 4 },
    configurable: false,
  },
  {
    id: 'sonarr',
    name: 'Sonarr',
    description: 'TV show downloads',
    icon: Download,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'radarr',
    name: 'Radarr',
    description: 'Movie downloads',
    icon: Play,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'qbittorrent',
    name: 'qBittorrent',
    description: 'Torrent client status',
    icon: Download,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'prowlarr',
    name: 'Prowlarr',
    description: 'Indexer and app sync status',
    icon: Search,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    description: 'Media server dashboard',
    icon: Play,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'plex',
    name: 'Plex',
    description: 'Plex media server',
    icon: Play,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'uptime-kuma',
    name: 'Uptime Kuma',
    description: 'Service monitoring',
    icon: Activity,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Current weather and forecast',
    icon: Wind,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'esxi',
    name: 'ESXi VMs',
    description: 'VMware vSphere VMs',
    icon: Server,
    defaultSize: { w: 4, h: 3 },
    configurable: true,
  },
  {
    id: 'grafana-embed',
    name: 'Grafana Embed',
    description: 'Embedded Grafana dashboard',
    icon: BarChart3,
    defaultSize: { w: 6, h: 4 },
    configurable: true,
  },
  {
    id: 'app-shortcuts',
    name: 'App Shortcuts',
    description: 'Grouped app launcher widget',
    icon: Grid3x3,
    defaultSize: { w: 5, h: 3 },
    configurable: true,
  },
  {
    id: 'search-widget',
    name: 'Search Widget',
    description: 'Standalone search box',
    icon: Search,
    defaultSize: { w: 5, h: 2 },
    configurable: true,
  },
  {
    id: 'quick-stats-bar',
    name: 'Quick Stats',
    description: 'Summary of key metrics',
    icon: Activity,
    defaultSize: { w: 6, h: 1 },
    configurable: false,
  },
];

export function getWidgetRegistry() {
  return widgets;
}

export function getWidget(id: string) {
  return widgets.find((w) => w.id === id);
}
