'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import WidgetCard from './WidgetCard';
import AddWidgetModal from './AddWidgetModal';
import SystemStatsWidget from '@/components/widgets/SystemStats';
import DockerContainersWidget from '@/components/widgets/DockerContainers';
import SonarrWidget from '@/components/widgets/Sonarr';
import RadarrWidget from '@/components/widgets/Radarr';
import QbittorrentWidget from '@/components/widgets/Qbittorrent';
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
}

const WIDGET_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'system-stats': SystemStatsWidget,
  'docker-containers': DockerContainersWidget,
  sonarr: SonarrWidget,
  radarr: RadarrWidget,
  qbittorrent: QbittorrentWidget,
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

export default function DashboardGrid() {
  const { data: session } = useSession();
  const [layout, setLayout] = useState<GridItem[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLayout();
  }, [session?.user?.id]);

  const fetchLayout = async () => {
    try {
      const response = await fetch('/api/layout');
      const data = await response.json();
      setLayout(data.layout || []);
    } catch {
      setLayout([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLayoutChange = (newLayout: any[]) => {
    setLayout(newLayout.map((item) => ({
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
    const newId = `${widgetId}-${Date.now()}`;
    const newItem: GridItem = {
      i: newId,
      x: 0,
      y: layout.reduce((max, item) => Math.max(max, item.y + item.h), 0),
      w: 4,
      h: 4,
      type: widgetId,
      config,
    };

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

    setShowAddWidget(false);
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

  return (
    <div className="px-6 pb-6">
      <GridLayout
        className="layout"
        layout={layout}
        onLayoutChange={handleLayoutChange}
        cols={12}
        rowHeight={60}
        width={1920}
        isDraggable={editMode}
        isResizable={editMode}
        compactType="vertical"
        preventCollision={false}
        useCSSTransforms={true}
      >
        {layout.map((item) => {
          const Component = WIDGET_COMPONENTS[item.type];
          return (
            <div key={item.i} className="animate-in">
              <WidgetCard
                id={item.i}
                title={item.type}
                onRemove={handleRemoveWidget}
                editMode={editMode}
              >
                {Component ? <Component config={item.config} /> : <div>Widget not found</div>}
              </WidgetCard>
            </div>
          );
        })}
      </GridLayout>

      {editMode && (
        <div className="flex gap-3 mt-6 sticky bottom-6">
          <button
            onClick={() => setShowAddWidget(true)}
            className="btn btn-primary"
          >
            + Add Widget
          </button>
          <button
            onClick={() => {
              handleSaveLayout();
              setEditMode(false);
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
          onClose={() => setShowAddWidget(false)}
        />
      )}
    </div>
  );
}
