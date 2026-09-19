'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import { Swords, Check, X, Loader2, WifiOff, AlertTriangle } from 'lucide-react';
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
  const [networkWarning, setNetworkWarning] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [gameData, setGameData] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let s;
    let slowTimer;

    async function connect() {
      try {
        // Slow connection warning after 5 seconds
        slowTimer = setTimeout(() => {
          if (mounted && !isConnected) {
            setNetworkWarning('Network seems slow. Still connecting...');
          }
        }, 5000);

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

        // Register listeners BEFORE anything else
        const onConnect = () => {
          setIsConnected(true);
          setConnectionError('');
          setNetworkWarning('');
          clearTimeout(slowTimer);
          // Ask server for current state
          s.emit('requestState', (state) => {
            if (!mounted) return;
            setMyId(state.yourId);
            setOnlineUsers(state.onlineUsers);
          });
        };

        const onDisconnect = () => {
          setIsConnected(false);
          setNetworkWarning('Connection lost. Reconnecting...');
        };

        const onConnectError = (err) => {
          setIsConnected(false);
          setNetworkWarning('');
          setConnectionError('Cannot connect to game server. Retrying...');
        };

        const onOnlineUsers = (users) => setOnlineUsers(users);

        const onChallengeReceived = (data) => setIncomingChallenge(data);

        const onChallengeDeclined = () => {
          setChallengePending(false);
          setMessage('Challenge declined');
          setTimeout(() => setMessage(''), 3000);
        };

        const onChallengeExpired = () => {
          setChallengePending(false);
          setMessage('Challenge expired or opponent offline');
          setTimeout(() => setMessage(''), 3000);
        };

        const onGameStart = (data) => {
          setChallengePending(false);
          setGameData(data);
          setGameActive(true);
          setIncomingChallenge(null);
          setMessage('');
        };

        s.on('connect', onConnect);
        s.on('disconnect', onDisconnect);
        s.on('connect_error', onConnectError);
        s.on('onlineUsers', onOnlineUsers);
        s.on('challengeReceived', onChallengeReceived);
        s.on('challengeDeclined', onChallengeDeclined);
        s.on('challengeExpired', onChallengeExpired);
        s.on('gameStart', onGameStart);

        // If already connected, run onConnect manually
        if (s.connected) onConnect();

        return () => {
          clearTimeout(slowTimer);
          s.off('connect', onConnect);
          s.off('disconnect', onDisconnect);
          s.off('connect_error', onConnectError);
          s.off('onlineUsers', onOnlineUsers);
          s.off('challengeReceived', onChallengeReceived);
          s.off('challengeDeclined', onChallengeDeclined);
          s.off('challengeExpired', onChallengeExpired);
          s.off('gameStart', onGameStart);
        };
      } catch (err) {
        console.error('Socket setup error:', err);
        setConnectionError('Error connecting to server');
      }
    }

    let cleanup;
    connect().then((fn) => {
      cleanup = fn;
    });

    return () => {
      mounted = false;
      clearTimeout(slowTimer);
      if (typeof cleanup === 'function') cleanup();
    };
  }, [router]);

  const challengeUser = (targetUserId) => {
    if (!socket) return;
    socket.emit('challenge', { targetUserId }, (res) => {
      if (res?.error) setMessage(res.error);
      else setChallengePending(true);
    });
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

      {/* Connection status bar */}
      {!isConnected && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500 text-amber-400 rounded-lg flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse" />
          {networkWarning || 'Connecting...'}
        </div>
      )}

      {networkWarning && isConnected && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500 text-amber-400 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {networkWarning}
        </div>
      )}

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
        {onlineUsers.filter((u) => u.id !== myId).length === 0 ? (
          <p className="text-center text-gray-400">
            {isConnected ? 'No other players online' : 'Loading players...'}
          </p>
        ) : (
          onlineUsers
            .filter((u) => u.id !== myId)
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