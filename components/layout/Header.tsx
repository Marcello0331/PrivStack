'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search, Settings, LogOut, Clock } from 'lucide-react';

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [time, setTime] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date().toLocaleString('en-US', {
        timeZone: 'Europe/Budapest',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setTime(now);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = (e.target as any).search?.value;
    if (query) {
      window.open(`https://google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    }
  };

  return (
    <header className="glass fixed top-0 left-0 right-0 z-50 border-b">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left: Logo + Hostname + Clock */}
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold gradient-text">PrivStack</h1>
          <div className="hidden lg:flex items-center gap-4 text-sm text-gray-400">
            <span>192.168.0.131</span>
            <div className="flex items-center gap-1">
              <Clock size={16} />
              {time}
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
          <div
            className={`glass-sm px-4 py-2 flex items-center gap-2 transition-all ${
              searchFocused ? 'ring-2 ring-accent-blue' : ''
            }`}
          >
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              name="search"
              placeholder="Search... (Ctrl+K)"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
            />
          </div>
        </form>

        {/* Right: Edit Toggle + Settings + User Menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-all glass-hover"
            title="Toggle edit mode"
          >
            ✎
          </button>

          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-lg transition-all glass-hover"
            title="Settings"
          >
            <Settings size={20} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full glass-sm flex items-center justify-center text-sm font-bold"
            >
              {session?.user?.name?.[0]?.toUpperCase() || 'A'}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 glass rounded-lg overflow-hidden shadow-2xl">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{(session?.user as any)?.role || 'viewer'}</p>
                </div>
                <button
                  onClick={() => {
                    router.push('/settings');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm transition-all"
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    signOut({ redirect: false });
                    router.push('/login');
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-400 text-sm transition-all"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit mode indicator */}
      {editMode && (
        <div className="px-6 py-2 bg-accent-blue/10 border-t border-accent-blue/30 text-xs text-accent-blue flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-pulse"></span>
          Edit mode active - drag widgets to rearrange, click "..." menu for settings
        </div>
      )}
    </header>
  );
}
