'use client';

import { MoreVertical, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface WidgetCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  editMode?: boolean;
  onRemove: (id: string) => void;
  onRefresh?: () => void;
  onSettings?: () => void;
}

export default function WidgetCard({
  id,
  title,
  children,
  editMode,
  onRemove,
  onRefresh,
  onSettings,
}: WidgetCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="glass rounded-lg overflow-visible flex flex-col h-full glass-hover">
      {/* Header */}
      <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between bg-white/2 min-h-8">
        <h3 className="font-semibold text-[11px] leading-tight truncate pr-2">{title.replace(/-/g, ' ').toUpperCase()}</h3>

        {editMode && (
          <div className="relative widget-action-menu">
            <button
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded-md hover:bg-white/10 transition-all"
              title="Widget actions"
            >
              <MoreVertical size={14} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 glass rounded-lg overflow-hidden shadow-2xl z-[80]">
                {onRefresh && (
                  <button
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRefresh();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-white/5 text-xs flex items-center gap-2 transition-all"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                )}
                {onSettings && (
                  <button
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSettings();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-white/5 text-xs flex items-center gap-2 transition-all"
                  >
                    <Settings size={14} />
                    Settings
                  </button>
                )}
                <button
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-red-500/10 text-red-400 text-xs flex items-center gap-2 transition-all"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-2.5 overflow-auto min-h-0">{children}</div>
    </div>
  );
}
