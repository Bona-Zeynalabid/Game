import Link from 'next/link';
import { Play, Trophy, Users } from 'lucide-react';
import Button from '../components/Button';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-5xl font-bold mb-4">
        <span className="text-white">Welcome to </span>
        <span className="text-yellow-bright">GameName</span>
      </h1>
      <p className="text-xl text-gray-400 mb-8 max-w-2xl">
        Challenge players worldwide in exciting matches. Play solo, pair up, or join leagues to prove your skills.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link href="/play">
          <Button size="lg" icon={<Play className="w-5 h-5" />}>
            Play Now
          </Button>
        </Link>
        <Link href="/leaderboard">
          <Button variant="outline" size="lg" icon={<Trophy className="w-5 h-5" />}>
            Leaderboard
          </Button>
        </Link>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="bg-dark-800 p-6 rounded-xl border border-dark-600">
          <Users className="w-10 h-10 text-yellow-bright mb-3" />
          <h3 className="text-xl font-semibold">Multiplayer</h3>
          <p className="text-gray-400">Play with friends or random opponents.</p>
        </div>
        <div className="bg-dark-800 p-6 rounded-xl border border-dark-600">
          <Trophy className="w-10 h-10 text-yellow-bright mb-3" />
          <h3 className="text-xl font-semibold">Leagues</h3>
          <p className="text-gray-400">Compete in championships and earn rewards.</p>
        </div>
        <div className="bg-dark-800 p-6 rounded-xl border border-dark-600">
          <Play className="w-10 h-10 text-yellow-bright mb-3" />
          <h3 className="text-xl font-semibold">Quick Play</h3>
          <p className="text-gray-400">Jump into a match instantly.</p>
        </div>
      </div>
    </div>
  );
}