'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeSocket } from '@/lib/socket';
import OnlineBoard from '@/components/OnlineBoard';

export default function LeagueMatchPage() {
  const router = useRouter();
  const [socket, setSocket] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('leagueMatch');
    if (!raw) {
      router.push('/league');
      return;
    }
    try {
      setMatchData(JSON.parse(raw));
    } catch {
      router.push('/league');
      return;
    }

    const init = async () => {
      try {
        const s = await initializeSocket();
        setSocket(s);
      } catch (e) {
        console.error('Socket init error:', e);
        setError('Failed to connect to server');
      }
    };
    init();
  }, [router]);

  if (error) {
    return (
      <div className="text-center text-red-400 mt-8">{error}</div>
    );
  }

  if (!matchData || !socket) {
    return <div className="text-center text-gray-400 mt-8">Loading match...</div>;
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center p-4">
      <button
        onClick={() => router.push(`/league/${matchData.leagueCode}`)}
        className="self-start mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition"
      >
        ← Back to League
      </button>
      <OnlineBoard
        socket={socket}
        roomCode={matchData.roomCode}
        initialBoard={matchData.board}
        initialCurrentPlayer={matchData.currentPlayer}
        myColor={matchData.yourColor}
        myUsername="You"
        opponentUsername={matchData.opponentUsername}
        isLeague={true}
        leagueCode={matchData.leagueCode}
      />
    </div>
  );
}