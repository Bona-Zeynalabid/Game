'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Play, Trophy, User } from 'lucide-react';
import './globals.css';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/play', label: 'Play', icon: Play },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function RootLayout({ children }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-900 text-white flex flex-col">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 bg-dark-900/90 backdrop-blur border-b border-dark-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl font-bold text-yellow-bright">G</span>
              </Link>
              <nav className="flex gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-yellow-bright text-dark-900'
                          : 'text-gray-300 hover:bg-dark-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-dark-700 py-4">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            © 2025 GameName. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  );
}