'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Link from 'next/link';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }

    window.location.href = '/';
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-dark-800 rounded-xl border border-dark-600">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

      <p className="text-sm text-gray-400 mb-4 text-center">
        Enter your username or email to continue.
      </p>

      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500 text-red-400 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Username or Email</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded focus:outline-none focus:border-yellow-bright"
            required
          />
        </div>
        <Button type="submit" fullWidth isLoading={loading}>
          Login
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-400">
        No account?{' '}
        <Link href="/register" className="text-yellow-bright hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}