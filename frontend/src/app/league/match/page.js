'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initializeSocket } from '@/lib/socket';
import OnlineBoard from '@/components/OnlineBoard';

export default function LeagueMatchPage() {
  const router = useRouter();
  const [socket, setSocket] = useState(null);
  const [matchData, setMatchData] = useState(null);

  useEffect(() => {
    const data = sessionStorage.getItem('leagueMatch');
    if (!data) {
      router.push('/league');
      return;
    }
    setMatchData(JSON.parse(data));

    const init = async () => {
      const s = await initializeSocket();
      setSocket(s);
    };
    init();
  }, [router]);

  if (!matchData || !socket) return <div className="text-center mt-8">Loading...</div>;

  return (
    <div className="min-h-[70vh] flex flex-col items-center">
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