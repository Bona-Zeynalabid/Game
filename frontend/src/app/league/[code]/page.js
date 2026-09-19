'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/Button';
import Avatar from '@/components/Avatar';
import { initializeSocket } from '@/lib/socket';
import { Trophy, Users, Bell, Swords, Crown, ChevronRight, ShieldAlert } from 'lucide-react';

export default function LeagueLobby() {
  const { code } = useParams();
  const [socket, setSocket] = useState(null);
  const [leagueData, setLeagueData] = useState(null);
  const [message, setMessage] = useState('');
  const [notification, setNotification] = useState('');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const s = await initializeSocket();
      setSocket(s);

      s.emit('getLeague', { code }, (data) => {
        if (data.error) {
          setMessage(data.error);
        } else {
          setLeagueData(data);
        }
      });

      s.on('leagueUpdate', (data) => {
        if (data.code === code) {
          setLeagueData(prev => ({
            ...prev,
            bracket: data.bracket || prev.bracket,
            status: data.status || prev.status,
            players: data.players || prev.players,
            playerNames: data.playerNames || prev.playerNames,
          }));
        }
      });

      s.on('leagueMatchReady', (data) => {
        setNotification(`Your match is ready! Opponent: ${data.opponentUsername}`);
        s.emit('getLeague', { code }, (fresh) => {
          if (fresh.myMatch) {
            setLeagueData(prev => ({ ...prev, myMatch: fresh.myMatch }));
          }
        });
        setTimeout(() => setNotification(''), 5000);
      });

      s.on('leagueCompleted', (data) => {
        if (data.leagueCode === code) {
          setLeagueData(prev => ({ ...prev, status: 'completed', champion: data.champion }));
        }
      });

      return () => {
        s.off('leagueUpdate');
        s.off('leagueMatchReady');
        s.off('leagueCompleted');
      };
    };
    init();
  }, [code, router]);

  const playerNames = leagueData?.playerNames || {};
  const getPlayerName = (id) => playerNames[id] || id;
  const myMatch = leagueData?.myMatch;

  const handlePlayMatch = () => {
    if (myMatch) {
      sessionStorage.setItem(
        'leagueMatch',
        JSON.stringify({
          roomCode: myMatch.roomCode,
          opponentUsername: myMatch.opponentUsername,
          yourColor: myMatch.yourColor,
          leagueCode: code,
          board: myMatch.board,
          currentPlayer: myMatch.currentPlayer,
        })
      );
      router.push(`/league/match?code=${code}&roomCode=${myMatch.roomCode}`);
    }
  };

  const getRoundLabel = (index, totalRounds) => {
    if (index === totalRounds - 1) return 'Finals';
    if (index === totalRounds - 2) return 'Semi-Finals';
    if (index === totalRounds - 3) return 'Quarter-Finals';
    return `Round ${index + 1}`;
  };

  const symmetricBracket = useMemo(() => {
    if (!leagueData?.bracket || leagueData.bracket.length === 0) return null;

    const rounds = leagueData.bracket;
    const totalRounds = rounds.length;

    if (totalRounds === 1) {
      return {
        leftRounds: [],
        finalMatch: rounds[0].matches[0],
        rightRounds: [],
        totalRounds,
      };
    }

    const leftRounds = [];
    const rightRounds = [];

    for (let rIdx = 0; rIdx < totalRounds - 1; rIdx++) {
      const roundMatches = rounds[rIdx].matches || [];
      const half = Math.ceil(roundMatches.length / 2);

      leftRounds.push({
        title: getRoundLabel(rIdx, totalRounds),
        matches: roundMatches.slice(0, half),
      });

      rightRounds.push({
        title: getRoundLabel(rIdx, totalRounds),
        matches: roundMatches.slice(half),
      });
    }

    const finalMatch = rounds[totalRounds - 1].matches[0];

    return {
      leftRounds,
      finalMatch,
      rightRounds,
      totalRounds,
    };
  }, [leagueData]);

  if (message) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md backdrop-blur-md">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4 animate-bounce" />
          <p className="text-xl font-bold text-red-400">{message}</p>
        </div>
      </div>
    );
  }

  if (!leagueData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-yellow-bright/20 border-t-yellow-bright animate-spin" />
          <Trophy className="w-6 h-6 text-yellow-bright absolute inset-0 m-auto" />
        </div>
        <p className="text-gray-400 font-medium tracking-wide animate-pulse">Entering League Arena...</p>
      </div>
    );
  }

  const MatchCard = ({ match, isFinal = false }) => {
    if (!match) return null;
    const player1Name = getPlayerName(match.players?.[0]);
    const player2Name = getPlayerName(match.players?.[1]);
    const isCompleted = Boolean(match.winner);

    return (
      <div
        className={`relative w-full rounded-lg md:rounded-xl border transition-all duration-300 shadow-md ${
          isFinal
            ? 'border-amber-500/60 bg-gradient-to-b from-amber-500/10 via-slate-900 to-slate-900 ring-2 ring-amber-500/20'
            : isCompleted
            ? 'border-emerald-500/40 bg-gradient-to-b from-slate-800 to-slate-900'
            : 'border-slate-800 bg-slate-900/90'
        }`}
      >
        <div className="p-1.5 md:p-2.5 space-y-1 md:space-y-1.5">
          <div
            className={`flex items-center justify-between p-1 md:p-1.5 rounded-md transition-colors ${
              match.winner === match.players?.[0]
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
              <Avatar src={null} size="xs" />
              <span
                className={`text-[10px] md:text-xs font-bold truncate ${
                  match.winner === match.players?.[0]
                    ? 'text-emerald-400'
                    : match.players?.[0]
                    ? 'text-slate-200'
                    : 'text-slate-500 italic'
                }`}
              >
                {match.players?.[0] ? player1Name : 'TBD'}
              </span>
            </div>
            {match.winner === match.players?.[0] && (
              <span className="text-[8px] md:text-[9px] font-black px-1 md:px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                WIN
              </span>
            )}
          </div>

          <div className="relative flex items-center justify-center my-0.5">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute bg-slate-900 px-1.5 text-[8px] md:text-[9px] font-black text-slate-500 tracking-widest uppercase">
              VS
            </span>
          </div>

          <div
            className={`flex items-center justify-between p-1 md:p-1.5 rounded-md transition-colors ${
              match.winner === match.players?.[1]
                ? 'bg-emerald-500/10 border border-emerald-500/30'
                : 'bg-slate-800/40'
            }`}
          >
            <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
              <Avatar src={null} size="xs" />
              <span
                className={`text-[10px] md:text-xs font-bold truncate ${
                  match.winner === match.players?.[1]
                    ? 'text-emerald-400'
                    : match.players?.[1]
                    ? 'text-slate-200'
                    : 'text-slate-500 italic'
                }`}
              >
                {match.players?.[1] ? player2Name : 'TBD'}
              </span>
            </div>
            {match.winner === match.players?.[1] && (
              <span className="text-[8px] md:text-[9px] font-black px-1 md:px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                WIN
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 py-4 md:py-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 md:top-6 md:right-6 md:left-auto md:translate-x-0 bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-bold px-4 md:px-5 py-2.5 md:py-3 rounded-xl shadow-2xl shadow-yellow-500/20 z-50 flex items-center gap-2 md:gap-3 animate-slide-in backdrop-blur-md border border-yellow-200 max-w-[90vw] md:max-w-md">
          <Bell className="w-4 h-4 md:w-5 md:h-5 animate-bounce" />
          <span className="text-sm md:text-base truncate">{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-4 md:p-8 mb-6 md:mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 md:w-64 h-48 md:h-64 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <span className="px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-bold tracking-widest text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full uppercase">
                Tournament Lobby
              </span>
              <span className="text-[10px] md:text-xs text-slate-400 font-mono">CODE: {code}</span>
            </div>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight break-words">
              {leagueData.name}
            </h2>
            <div className="flex items-center gap-3 md:gap-4 mt-2 md:mt-3 text-xs md:text-sm text-slate-400">
              <span className="flex items-center gap-1 md:gap-1.5">
                <span className={`w-2 h-2 rounded-full ${leagueData.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                Status: <strong className="text-slate-200 capitalize">{leagueData.status}</strong>
              </span>
            </div>
          </div>

          {myMatch && (
            <div className="flex items-center">
              <Button
                variant="primary"
                onClick={handlePlayMatch}
                className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-base md:text-lg rounded-xl shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 md:gap-3 group"
              >
                <Swords className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:rotate-12" />
                <span>ENTER MATCH</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main content: Bracket first on mobile, Roster second */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">
        {/* Bracket - now first in DOM order for mobile */}
        <div className="xl:col-span-3 order-1 xl:order-2">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-3 md:p-6 shadow-xl">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-slate-800">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
              <h3 className="text-lg md:text-xl font-black text-slate-100 tracking-wide">CHAMPIONSHIP BRACKET</h3>
            </div>

            {symmetricBracket ? (
              <div className="overflow-x-auto pb-4 md:pb-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                <div className="min-w-[720px] md:min-w-[900px] flex items-center justify-between gap-2 md:gap-4 py-2 md:py-4">
                  {/* LEFT BRACKET WING */}
                  <div className="flex-1 flex gap-3 md:gap-6 justify-start">
                    {symmetricBracket.leftRounds.map((round, rIdx) => (
                      <div key={rIdx} className="flex-1 min-w-[140px] md:min-w-[180px] max-w-[180px] md:max-w-[220px] flex flex-col">
                        <div className="text-center mb-2 md:mb-4">
                          <span className="px-2 md:px-3 py-1 rounded-lg bg-slate-800 text-[9px] md:text-[10px] font-extrabold text-amber-400 border border-slate-700 uppercase tracking-wider">
                            {round.title}
                          </span>
                        </div>
                        <div className="flex flex-col justify-around flex-grow gap-3 md:gap-6">
                          {round.matches.map((match, mIdx) => (
                            <MatchCard key={mIdx} match={match} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* CENTER FINALS & TROPHY DISPLAY */}
                  <div className="w-[180px] md:w-[240px] flex flex-col items-center justify-center shrink-0 px-1 md:px-2 my-auto">
                    <div className="text-center mb-2 md:mb-4">
                      <span className="px-3 md:px-4 py-1 md:py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/40 text-[10px] md:text-xs font-black tracking-widest uppercase">
                        Finals
                      </span>
                    </div>

                    <div className="w-full relative">
                      <div className="absolute -top-8 md:-top-12 left-1/2 -translate-x-1/2 w-16 md:w-24 h-16 md:h-24 bg-amber-400/10 blur-xl rounded-full pointer-events-none" />
                      <div className="flex justify-center mb-2 md:mb-3">
                        <Trophy className="w-8 h-8 md:w-10 md:h-10 text-amber-400 animate-pulse drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                      </div>
                      <MatchCard match={symmetricBracket.finalMatch} isFinal={true} />
                    </div>
                  </div>

                  {/* RIGHT BRACKET WING */}
                  <div className="flex-1 flex gap-3 md:gap-6 justify-end">
                    {symmetricBracket.rightRounds.slice().reverse().map((round, rIdx) => (
                      <div key={rIdx} className="flex-1 min-w-[140px] md:min-w-[180px] max-w-[180px] md:max-w-[220px] flex flex-col">
                        <div className="text-center mb-2 md:mb-4">
                          <span className="px-2 md:px-3 py-1 rounded-lg bg-slate-800 text-[9px] md:text-[10px] font-extrabold text-amber-400 border border-slate-700 uppercase tracking-wider">
                            {round.title}
                          </span>
                        </div>
                        <div className="flex flex-col justify-around flex-grow gap-3 md:gap-6">
                          {round.matches.map((match, mIdx) => (
                            <MatchCard key={mIdx} match={match} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Scroll hint for mobile */}
                <div className="md:hidden text-center mt-2 text-slate-500 text-xs flex items-center justify-center gap-1">
                  <ChevronRight className="w-3 h-3" /> Swipe horizontally to view full bracket
                </div>
              </div>
            ) : (
              <div className="text-center py-12 md:py-16 px-4 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                <Users className="w-10 h-10 md:w-12 md:h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                <p className="text-slate-400 font-medium text-sm md:text-base">Waiting for all contenders to enter the arena...</p>
              </div>
            )}
          </div>
        </div>

        {/* Squad Roster */}
        <div className="xl:col-span-1 order-2 xl:order-1">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-4 md:p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 md:pb-4 mb-3 md:mb-4 border-b border-slate-800">
              <h3 className="text-base md:text-lg font-black text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
                <span>SQUAD ROSTER</span>
              </h3>
              <span className="text-xs font-bold px-2 md:px-2.5 py-0.5 md:py-1 rounded-md bg-slate-800 text-amber-400 border border-slate-700 font-mono">
                {leagueData.players?.length || 0} / {leagueData.size}
              </span>
            </div>
            
            <div className="space-y-2 md:space-y-2.5 max-h-[400px] md:max-h-[650px] overflow-y-auto pr-1">
              {leagueData.players?.map((playerId, idx) => {
                const isChampion = leagueData.champion === playerId;
                return (
                  <div
                    key={playerId}
                    className={`flex items-center justify-between p-2 md:p-3 rounded-lg md:rounded-xl border transition-all duration-200 ${
                      isChampion
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-slate-800/50 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-500 w-4">{idx + 1}</span>
                      <Avatar src={null} size="sm" />
                      <span className="text-slate-200 font-semibold text-sm truncate">
                        {getPlayerName(playerId)}
                      </span>
                    </div>
                    {isChampion && <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Champion Banner */}
      {leagueData.status === 'completed' && leagueData.champion && (
        <div className="mt-6 md:mt-8 relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-2 border-amber-400/50 p-6 md:p-8 rounded-2xl text-center backdrop-blur-md shadow-2xl">
          <div className="absolute inset-0 bg-yellow-400/5 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-amber-400/20 rounded-full flex items-center justify-center mb-2 md:mb-3 border border-amber-400/40">
              <Crown className="w-8 h-8 md:w-10 md:h-10 text-amber-400 animate-bounce" />
            </div>
            <h3 className="text-xs md:text-sm font-extrabold tracking-widest text-amber-400 uppercase mb-1">
              League Victor
            </h3>
            <p className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-wide break-words">
              {getPlayerName(leagueData.champion)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}