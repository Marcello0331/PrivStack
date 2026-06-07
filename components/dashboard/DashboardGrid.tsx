'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import GridLayout, { WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetCard from './WidgetCard';
import AddWidgetModal from './AddWidgetModal';
import { getWidget } from '@/lib/widgetRegistry';
import SystemStatsWidget from '@/components/widgets/SystemStats';
import DockerContainersWidget from '@/components/widgets/DockerContainers';
import SonarrWidget from '@/components/widgets/Sonarr';
import RadarrWidget from '@/components/widgets/Radarr';
import QbittorrentWidget from '@/components/widgets/Qbittorrent';
import ProwlarrWidget from '@/components/widgets/Prowlarr';
import JellyfinWidget from '@/components/widgets/Jellyfin';
import PlexWidget from '@/components/widgets/Plex';
import UptimeKumaWidget from '@/components/widgets/UptimeKuma';
import WeatherWidget from '@/components/widgets/Weather';
import EsxiWidget from '@/components/widgets/Esxi';
import GrafanaEmbedWidget from '@/components/widgets/GrafanaEmbed';
import AppShortcutsWidget from '@/components/widgets/AppShortcuts';
import SearchWidget from '@/components/widgets/SearchWidget';
import QuickStatsWidget from '@/components/widgets/QuickStats';

interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  config?: Record<string, any>;
  minW?: number;
  minH?: number;
  maxH?: number;
}

const ResponsiveGridLayout = WidthProvider(GridLayout);

const LAYOUT_RULES: Record<string, Partial<GridItem> & { minW: number; minH: number; maxH?: number }> = {
  'system-stats': { minW: 3, minH: 2, w: 4, h: 3 },
  'docker-containers': { minW: 4, minH: 3, w: 5, h: 4 },
  sonarr: { minW: 3, minH: 2, w: 4, h: 3 },
  radarr: { minW: 3, minH: 2, w: 4, h: 3 },
  qbittorrent: { minW: 3, minH: 2, w: 4, h: 3 },
  prowlarr: { minW: 3, minH: 2, w: 4, h: 3 },
  jellyfin: { minW: 3, minH: 2, w: 4, h: 3 },
  plex: { minW: 3, minH: 2, w: 4, h: 3 },
  'quick-stats-bar': { minW: 3, minH: 1, maxH: 2, w: 6, h: 1 },
  'search-widget': { minW: 3, minH: 1, maxH: 2, w: 5, h: 2 },
  'uptime-kuma': { minW: 3, minH: 2, w: 4, h: 3 },
  weather: { minW: 3, minH: 2, w: 4, h: 3 },
  esxi: { minW: 3, minH: 2, w: 4, h: 3 },
  'app-shortcuts': { minW: 3, minH: 2, w: 5, h: 3 },
  'grafana-embed': { minW: 4, minH: 3, w: 6, h: 4 },
};

function normalizeLayoutItem(item: GridItem): GridItem {
  const rules = LAYOUT_RULES[item.type];
  if (!rules) {
    return {
      ...item,
      minW: item.minW || 3,
      minH: item.minH || 2,
    };
  }

  return {
    ...item,
    w: Math.max(rules.minW, Math.min(item.w || rules.w || 4, item.type === 'quick-stats-bar' ? 6 : 12)),
    h: Math.max(rules.minH, Math.min(item.h || rules.h || 3, rules.maxH || 12)),
    minW: rules.minW,
    minH: rules.minH,
    maxH: rules.maxH,
  };
}

const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'system-stats': SystemStatsWidget,
  'docker-containers': DockerContainersWidget,
  sonarr: SonarrWidget,
  radarr: RadarrWidget,
  qbittorrent: QbittorrentWidget,
  prowlarr: ProwlarrWidget,
  jellyfin: JellyfinWidget,
  plex: PlexWidget,
  'uptime-kuma': UptimeKumaWidget,
  weather: WeatherWidget,
  esxi: EsxiWidget,
  'grafana-embed': GrafanaEmbedWidget,
  'app-shortcuts': AppShortcutsWidget,
  'search-widget': SearchWidget,
  'quick-stats-bar': QuickStatsWidget,
};

export default function DashboardGrid({
  editMode,
  onExitEditMode,
  showAddWidget,
  onCloseAddWidget,
}: {
  editMode: boolean;
  onExitEditMode: () => void;
  showAddWidget: boolean;
  onCloseAddWidget: () => void;
}) {
  const { data: session } = useSession();
  const [layout, setLayout] = useState<GridItem[]>([]);
  const [editingWidget, setEditingWidget] = useState<GridItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLayout();
  }, [session?.user?.id]);

  const fetchLayout = async () => {
    try {
      const response = await fetch('/api/layout');
      const data = await response.json();
      setLayout((data.layout || []).map(normalizeLayoutItem));
    } catch {
      setLayout([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = (newLayout: any[]) => {
    setLayout(newLayout.map((item) => normalizeLayoutItem({
      ...layout.find((l) => l.i === item.i) || { type: 'unknown', config: {} },
      ...item,
    })));
  };

  const handleSaveLayout = async () => {
    try {
      await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout }),
      });
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  };

  const handleAddWidget = async (widgetId: string, config?: Record<string, any>) => {
    const widget = getWidget(widgetId);
    const newId = `${widgetId}-${Date.now()}`;
    const newItem: GridItem = normalizeLayoutItem({
      i: newId,
      x: 0,
      y: layout.reduce((max, item) => Math.max(max, item.y + item.h), 0),
      w: widget?.defaultSize.w || 4,
      h: widget?.defaultSize.h || 4,
      type: widgetId,
      config,
    });

    const newLayout = [...layout, newItem];
    setLayout(newLayout);

    try {
      await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: newLayout }),
      });
    } catch (error) {
      console.error('Failed to save layout:', error);
    }

    onCloseAddWidget();
  };

  const handleUpdateWidgetConfig = async (_widgetId: string, config?: Record<string, any>) => {
    if (!editingWidget) return;

    const newLayout = layout.map((item) => (
      item.i === editingWidget.i ? { ...item, config } : item
    ));
    setLayout(newLayout);

    try {
      await fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: newLayout }),
      });
    } catch (error) {
      console.error('Failed to save widget settings:', error);
    }

    setEditingWidget(null);
  };

  const handleRemoveWidget = (id: string) => {
    const newLayout = layout.filter((item) => item.i !== id);
    setLayout(newLayout);

    try {
      fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: newLayout }),
      });
    } catch (error) {
      console.error('Failed to save layout:', error);
    }
  };

  if (loading) return null;

  const normalizedLayout = layout.map(normalizeLayoutItem);

  return (
    <div className="px-4 md:px-6 pb-6">
      <ResponsiveGridLayout
        className="layout"
        layout={normalizedLayout}
        onLayoutChange={handleLayoutChange}
        cols={12}
        rowHeight={52}
        isDraggable={editMode}
        isResizable={editMode}
        draggableCancel="button, input, textarea, select, option, a, .widget-action-menu"
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
      >
        {layout.map((item) => {
          const Component = WIDGET_COMPONENTS[item.type];
          const widget = getWidget(item.type);
          return (
            <div key={item.i} className="animate-in">
              <WidgetCard
                id={item.i}
                title={item.config?.title || item.type}
                onRemove={handleRemoveWidget}
                onSettings={widget?.configurable ? () => setEditingWidget(item) : undefined}
                editMode={editMode}
              >
                {Component ? <Component config={item.config} /> : <div>Widget not found</div>}
              </WidgetCard>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {editMode && (
        <div className="flex gap-3 mt-6 sticky bottom-6">
          <button
            onClick={() => {
              handleSaveLayout();
              onExitEditMode();
            }}
            className="btn btn-secondary"
          >
            Done Editing
          </button>
        </div>
      )}

      {showAddWidget && (
        <AddWidgetModal
          onAdd={handleAddWidget}
          onClose={onCloseAddWidget}
        />
      )}

      {editingWidget && (
        <AddWidgetModal
          editingWidget={{
            id: editingWidget.i,
            type: editingWidget.type,
            config: editingWidget.config,
          }}
          onAdd={handleUpdateWidgetConfig}
          onClose={() => setEditingWidget(null)}
        />
      )}
    </div>
  );
}
