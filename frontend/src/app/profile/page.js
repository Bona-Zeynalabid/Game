import { redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getCurrentUserId } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import StatCard from '@/components/StatCard';
import LogoutButton from '@/components/LogoutButton';
import { getLeague, getLeagueColor } from '@/lib/league';
import { 
  Trophy, 
  Coins, 
  Swords, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Flame, 
  Target 
} from 'lucide-react';

export default async function ProfilePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) redirect('/login');

  const league = getLeague(user);

  // Win Rate Calculation
  const totalGames = user.totalGames || (user.gamesWon + user.gamesLost + user.gamesDrawn) || 0;
  const winRate = totalGames > 0 ? Math.round((user.gamesWon / totalGames) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Banner & Player ID Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 p-6 md:p-8 shadow-2xl">
        {/* Background Decorative Glows */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Avatar & Info */}
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-300" />
              <Avatar
                src={user.avatar}
                alt={user.displayName || user.username}
                size="xl"
                isOnline={user.isOnline}
                className="relative ring-4 ring-slate-900"
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                  {user.displayName || user.username}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                  PRO PLAYER
                </span>
              </div>

              <p className="text-slate-400 font-medium">@{user.username}</p>
              {user.email && (
                <p className="text-xs text-slate-500 font-mono">{user.email}</p>
              )}

              {/* League & Coins Tags */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 shadow-inner">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className={`text-sm font-black ${getLeagueColor(league)}`}>
                    {league} Tier
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-black text-yellow-400">
                    {user.coins?.toLocaleString() || 0} Coins
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="w-full md:w-auto flex justify-center md:justify-end">
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Performance Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Win Rate</p>
            <p className="text-3xl font-black text-emerald-400 mt-1">{winRate}%</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Target className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Championships</p>
            <p className="text-3xl font-black text-amber-400 mt-1">{user.championshipsWon || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matches Played</p>
            <p className="text-3xl font-black text-sky-400 mt-1">{totalGames}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Swords className="w-6 h-6 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Stats Breakdown Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-slate-200 tracking-wide flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <span>CAREER STATISTICS</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon="coins" value={user.coins} label="Coins Balance" />
          <StatCard icon="gamesWon" value={user.gamesWon} label="Games Won" />
          <StatCard icon="gamesLost" value={user.gamesLost} label="Games Lost" />
          <StatCard icon="gamesDrawn" value={user.gamesDrawn} label="Games Drawn" />
          <StatCard icon="championshipsWon" value={user.championshipsWon} label="Championship Titles" />
          <StatCard icon="rating" value={league} label="Current League" />
        </div>
      </div>

      {/* Account Activity Details */}
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-black text-slate-200 tracking-wide border-b border-slate-800 pb-3">
          SYSTEM INFORMATION
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Swords className="w-4 h-4 text-slate-500" />
              Total Lifetime Games
            </span>
            <span className="font-mono font-bold text-slate-100">{totalGames}</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Last Active Session
            </span>
            <span className="font-mono font-bold text-slate-100">
              {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}