'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { initializeSocket } from '@/lib/socket';
import { Plus, LogIn } from 'lucide-react';

export default function LeagueHome() {
  const [socket, setSocket] = useState(null);
  const [myLeagues, setMyLeagues] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [size, setSize] = useState(4);
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const s = await initializeSocket();
      setSocket(s);

      s.emit('getMyLeagues', (res) => {
        if (res.leagues) setMyLeagues(res.leagues);
      });

      s.on('leagueUpdate', (data) => {
        // Update local league if it's in our list, or navigate if we are in the league
        setMyLeagues(prev => {
          const exists = prev.some(l => l.code === data.code);
          if (exists) {
            return prev.map(l => l.code === data.code ? { ...l, status: data.status, players: data.players } : l);
          }
          return prev;
        });
      });

      s.on('leagueMatchStart', (data) => {
        sessionStorage.setItem('leagueMatch', JSON.stringify(data));
        router.push(`/league/match?code=${data.leagueCode}&roomCode=${data.roomCode}`);
      });

      return () => {
        s.off('leagueUpdate');
        s.off('leagueMatchStart');
      };
    };
    init();
  }, [router]);

  const createLeague = () => {
    if (socket && name.trim()) {
      socket.emit('createLeague', { name: name.trim(), size }, (res) => {
        if (res.error) setMessage(res.error);
        else {
          setShowCreate(false);
          setName('');
          router.push(`/league/${res.code}`);
        }
      });
    } else {
      setMessage('League name is required');
    }
  };

  const joinLeague = () => {
    if (socket && joinCode.trim()) {
      socket.emit('joinLeague', { code: joinCode.trim().toUpperCase() }, (res) => {
        if (res.error) setMessage(res.error);
        else {
          setShowJoin(false);
          setJoinCode('');
          router.push(`/league/${joinCode.trim().toUpperCase()}`);
        }
      });
    } else {
      setMessage('Enter a league code');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">My Leagues</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}>
            <Plus className="w-4 h-4" /> Create
          </Button>
          <Button variant="secondary" onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}>
            <LogIn className="w-4 h-4" /> Join
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-dark-800 p-6 rounded-xl border border-dark-600 mb-6">
          <h3 className="text-xl font-semibold mb-4">Create League</h3>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="League Name"
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded mb-4 text-white focus:outline-none focus:border-yellow-bright"
          />
          <div className="mb-4">
            <label className="block text-sm mb-2">Players</label>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded text-white focus:outline-none focus:border-yellow-bright"
            >
              {[4, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} Players
                </option>
              ))}
            </select>
          </div>
          <Button variant="primary" fullWidth onClick={createLeague}>
            Create League
          </Button>
        </div>
      )}

      {showJoin && (
        <div className="bg-dark-800 p-6 rounded-xl border border-dark-600 mb-6">
          <h3 className="text-xl font-semibold mb-4">Join League</h3>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="League Code"
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded mb-4 text-white focus:outline-none focus:border-yellow-bright"
          />
          <Button variant="primary" fullWidth onClick={joinLeague}>
            Join League
          </Button>
        </div>
      )}

      {message && <p className="mt-4 text-red-400 text-center">{message}</p>}

      <div className="space-y-3 mt-6">
        {myLeagues.length === 0 ? (
          <p className="text-center text-gray-400">You are not in any league yet.</p>
        ) : (
          myLeagues.map((league) => (
            <div
              key={league.code}
              className="bg-dark-800 rounded-xl border border-dark-600 p-4 cursor-pointer hover:border-yellow-bright/50 transition"
              onClick={() => router.push(`/league/${league.code}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{league.name}</h3>
                  <p className="text-sm text-gray-400">
                    {league.players.length}/{league.size} players • {league.status}
                  </p>
                </div>
                <span className="text-yellow-bright font-mono">{league.code}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}