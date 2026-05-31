'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import AppTile from './AppTile';

interface App {
  id: number;
  name: string;
  url: string;
  icon_url: string;
  description: string;
  category: string;
  open_in: string;
  sort_order: number;
  pinned: number;
}

export default function AppLauncherBar() {
  const [apps, setApps] = useState<App[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const response = await fetch('/api/apps?pinned=1');
      const data = await response.json();
      setApps(data);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className={`transition-all ${collapsed ? 'h-12' : 'h-auto'}`}>
      <div className="pt-20 px-6 pb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-4 p-1 rounded-lg glass-sm hover:bg-white/10 transition-all inline-flex items-center gap-1 text-sm text-gray-400"
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          <span>Apps</span>
        </button>

        {!collapsed && (
          <div className="flex flex-wrap gap-3 items-start">
            {apps.map((app) => (
              <AppTile key={app.id} app={app} editMode={editMode} onUpdate={fetchApps} />
            ))}

            {editMode && (
              <button className="glass-sm hover:glass-hover p-3 rounded-xl transition-all flex flex-col items-center gap-2 w-20 h-24 justify-center">
                <Plus size={24} className="text-accent-blue" />
                <span className="text-xs text-center">Add app</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
