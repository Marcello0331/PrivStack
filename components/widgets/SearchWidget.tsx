'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export default function SearchWidget({ config }: { config?: Record<string, any> }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query) {
      window.open(`https://google.com/search?q=${encodeURIComponent(query)}`, '_blank');
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="glass-sm px-4 py-3 flex items-center gap-2">
        <Search size={20} className="text-accent-blue" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none"
          autoFocus
        />
      </div>
    </form>
  );
}
