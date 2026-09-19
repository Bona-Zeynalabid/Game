'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Link from 'next/link';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Load Google Identity Services script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('googleButton'),
        { theme: 'outline', size: 'large', width: '100%' }
      );
    }
  }, []);

  const handleGoogleResponse = async (response) => {
    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/');
      } else {
        setError(data.error || 'Google login failed');
      }
    } catch (err) {
      setError('Google login failed');
    }
  };

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
    router.push('/');
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-dark-800 rounded-xl border border-dark-600">
      <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

      {/* Google button container */}
      <div id="googleButton" className="w-full mb-4"></div>

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 border-t border-dark-600" />
        <span className="text-sm text-gray-400">or</span>
        <div className="flex-1 border-t border-dark-600" />
      </div>

      <p className="text-sm text-gray-400 mb-4 text-center">
        Development mode: no password needed.
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