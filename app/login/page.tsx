'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid credentials');
      } else if (result?.ok) {
        router.push('/');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass w-full max-w-md">
        <div className="p-8">
          <h1 className="text-3xl font-bold gradient-text text-center mb-2">PrivStack</h1>
          <p className="text-gray-400 text-center text-sm mb-8">Homelab Dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="admin"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-sm px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
