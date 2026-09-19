import { redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { getCurrentUserId } from '@/lib/auth';
import Avatar from '@/components/Avatar';
import { getLeague, getLeagueColor } from '@/lib/league';

export default async function LeaderboardPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect('/login');

  await dbConnect();
  const users = await User.find()
    .sort({ coins: -1, gamesWon: -1 })
    .limit(100)
    .select('username avatar coins gamesWon gamesLost championshipsWon')
    .lean();

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 text-center">Leaderboard</h2>
      <div className="space-y-3 max-w-3xl mx-auto">
        {users.map((user, index) => {
          const league = getLeague(user);
          return (
            <div
              key={user._id.toString()}
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                user._id.toString() === userId ? 'border-yellow-bright bg-yellow-bright/10' : 'border-dark-600 bg-dark-800'
              } hover:border-yellow-bright/50 transition-colors`}
            >
              <div className="w-10 text-center">
                <span className={`text-xl font-bold ${index < 3 ? 'text-yellow-bright' : 'text-gray-400'}`}>
                  {index + 1}
                </span>
              </div>
              <Avatar src={user.avatar} alt={user.username} size="sm" />
              <div className="flex-1">
                <div className="font-semibold text-white">{user.username}</div>
                <div className="text-sm text-gray-400">Won: {user.gamesWon} • Lost: {user.gamesLost}</div>
                <div className={`text-xs font-semibold ${getLeagueColor(league)}`}>{league}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-yellow-bright">{user.coins}</div>
                <div className="text-xs text-gray-500">coins</div>
              </div>
            </div>
          );
        })}
        {users.length === 0 && <p className="text-center text-gray-400">No players yet.</p>}
      </div>
    </div>
  );
}