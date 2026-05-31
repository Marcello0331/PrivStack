'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';

interface App {
  id: number;
  name: string;
  url: string;
  icon_url: string;
  description: string;
  open_in: string;
}

export default function AppTile({ app, editMode, onUpdate }: { app: App; editMode: boolean; onUpdate: () => void }) {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/apps/ping?url=${encodeURIComponent(app.url)}`);
      setIsOnline(response.ok);
    } catch {
      setIsOnline(false);
    }
  };

  const handleRemove = async () => {
    if (confirm(`Remove ${app.name} from launcher?`)) {
      try {
        await fetch(`/api/apps/${app.id}`, { method: 'DELETE' });
        onUpdate();
      } catch (error) {
        console.error('Failed to remove app:', error);
      }
    }
  };

  const handleOpen = () => {
    const target = app.open_in === 'newwindow' ? '_blank' : '_self';
    window.open(app.url, target);
  };

  return (
    <div
      className="glass-sm hover:glass-hover p-3 rounded-xl transition-all flex flex-col items-center gap-2 w-20 h-24 relative cursor-pointer group"
      onClick={handleOpen}
    >
      {editMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={12} />
        </button>
      )}

      <div className="relative w-12 h-12">
        <img
          src={app.icon_url || 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/question.png'}
          alt={app.name}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-white/30 ${
            isOnline === true ? 'bg-green-500' : isOnline === false ? 'bg-red-500' : 'bg-gray-500'
          }`}
        />
      </div>

      <p className="text-xs text-center line-clamp-2 text-gray-200">{app.name}</p>
    </div>
  );
}
