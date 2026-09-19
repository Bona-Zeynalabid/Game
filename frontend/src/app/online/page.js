'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import { Swords, Check, X, Loader2 } from 'lucide-react';
import { initializeSocket } from '@/lib/socket';
import OnlineBoard from '@/components/OnlineBoard';

export default function OnlinePage() {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [myId, setMyId] = useState(null);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [challengePending, setChallengePending] = useState(false);
  const [message, setMessage] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [gameActive, setGameActive] = useState(false);
  const [gameData, setGameData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let s;

    async function connect() {
      try {
        const res = await fetch('/api/socket-token');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!data.token) {
          router.push('/login');
          return;
        }

        s = await initializeSocket();
        if (!mounted) return;
        setSocket(s);

        s.on('connect', () => {
          setConnectionError('');
          console.log('Socket connected');
        });

        s.on('connect_error', (err) => {
          console.error('Socket connection error:', err.message);
          setConnectionError('Failed to connect to game server');
        });

        s.on('yourId', (id) => {
          setMyId(id);
        });

        s.on('onlineUsers', (users) => {
          console.log('Received online users:', users);
          setOnlineUsers(users);
        });

        s.on('challengeReceived', (data) => {
          setIncomingChallenge(data);
        });

        s.on('challengeDeclined', () => {
          setChallengePending(false);
          setMessage('Challenge declined');
          setTimeout(() => setMessage(''), 3000);
        });

        s.on('challengeExpired', () => {
          setChallengePending(false);
          setMessage('Challenge expired');
          setTimeout(() => setMessage(''), 3000);
        });

        s.on('gameStart', (data) => {
          setChallengePending(false);
          setGameData(data);
          setGameActive(true);
          setIncomingChallenge(null);
          setMessage('');
        });
      } catch (err) {
        console.error('Socket setup error:', err);
        setConnectionError('Error connecting to server');
      }
    }

    connect();

    return () => {
      mounted = false;
      if (s) {
        s.off('connect');
        s.off('connect_error');
        s.off('yourId');
        s.off('onlineUsers');
        s.off('challengeReceived');
        s.off('challengeDeclined');
        s.off('challengeExpired');
        s.off('gameStart');
      }
    };
  }, [router]);

  const challengeUser = (targetUserId) => {
    if (socket) {
      socket.emit('challenge', { targetUserId }, (res) => {
        if (res?.error) {
          setMessage(res.error);
        } else {
          setChallengePending(true);
        }
      });
    }
  };

  const respondToChallenge = (accept) => {
    if (incomingChallenge && socket) {
      socket.emit('challengeResponse', {
        challengerId: incomingChallenge.challengerId,
        accept,
      });
      setIncomingChallenge(null);
    }
  };

  const exitGame = () => {
    setGameActive(false);
    setGameData(null);
  };

  if (gameActive && gameData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center">
        <button
          onClick={exitGame}
          className="self-start mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          ← Back
        </button>
        <OnlineBoard
          socket={socket}
          roomCode={gameData.roomCode}
          initialBoard={gameData.board}
          initialCurrentPlayer={gameData.currentPlayer}
          myColor={gameData.yourColor}
          myUsername={gameData.myUsername}
          opponentUsername={gameData.opponentUsername}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-center">Online Players</h2>

      {connectionError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-400 rounded">
          {connectionError}
        </div>
      )}

      {incomingChallenge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 border border-yellow-bright rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-2">Challenge!</h3>
            <p className="text-gray-300 mb-4">
              {incomingChallenge.challengerUsername} wants to play
            </p>
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => respondToChallenge(true)}>
                <Check className="w-4 h-4" /> Accept
              </Button>
              <Button variant="outline" onClick={() => respondToChallenge(false)}>
                <X className="w-4 h-4" /> Decline
              </Button>
            </div>
          </div>
        </div>
      )}

      {challengePending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 border border-yellow-bright rounded-xl p-6 max-w-sm w-full mx-4 text-center">
            <Loader2 className="w-10 h-10 text-yellow-bright animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Challenge Sent</h3>
            <p className="text-gray-300">Waiting for opponent to respond...</p>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-4 p-2 bg-yellow-bright/10 border border-yellow-bright text-yellow-bright rounded">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {onlineUsers.filter(user => user.id !== myId).length === 0 ? (
          <p className="text-center text-gray-400">No other players online</p>
        ) : (
          onlineUsers
            .filter(user => user.id !== myId)
            .map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 bg-dark-800 rounded-xl border border-dark-600"
              >
                <Avatar src={user.avatar} alt={user.username} size="sm" isOnline />
                <div className="flex-1">
                  <div className="font-semibold text-white">{user.username}</div>
                  <div className="text-sm text-gray-400">Rating: {user.rating}</div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => challengeUser(user.id)}
                  disabled={challengePending || incomingChallenge !== null}
                >
                  <Swords className="w-4 h-4" /> Challenge
                </Button>
              </div>
            ))
        )}
      </div>
    </div>
  );
}