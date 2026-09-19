'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  createInitialBoard,
  getValidMoves,
  applyMoveSequence,
  PLAYER_RED,
  PLAYER_BLACK,
} from '@/lib/checkers';
import Button from './Button';

export default function OnlineBoard({
  socket,
  roomCode: initialRoomCode,
  initialBoard,
  initialCurrentPlayer,
  myColor: initialMyColor,
  myUsername,
  opponentUsername,
  isLeague = false,
  leagueCode = null,
}) {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard || createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState(initialCurrentPlayer ?? PLAYER_RED);
  const [myColor, setMyColor] = useState(initialMyColor ?? PLAYER_RED);
  const [roomCode] = useState(initialRoomCode);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [availableSequences, setAvailableSequences] = useState([]);
  const [moveSteps, setMoveSteps] = useState([]);
  const [message, setMessage] = useState('Your turn');
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  const myColorRef = useRef(myColor);
  useEffect(() => {
    myColorRef.current = myColor;
  }, [myColor]);

  // Sync state from server on mount and listen for updates
  useEffect(() => {
    if (!socket || !roomCode) return;

    // Ask server for current state (idempotent join + snapshot)
    socket.emit('joinGameRoom', { roomCode }, (res) => {
      if (res?.error) console.warn('joinGameRoom:', res.error);
    });

    const onMoveMade = ({ board: newBoard, currentPlayer: newTurn }) => {
      setBoard(newBoard);
      setCurrentPlayer(newTurn);
      setSelectedPiece(null);
      setAvailableSequences([]);
      setMoveSteps([]);
      setMessage(newTurn === myColorRef.current ? 'Your turn' : "Opponent's turn");
    };

    const onGameState = ({ board: b, currentPlayer: cp, myColor: mc }) => {
      if (b) setBoard(b);
      if (typeof cp === 'number') setCurrentPlayer(cp);
      if (typeof mc === 'number') {
        setMyColor(mc);
        myColorRef.current = mc;
      }
      setSelectedPiece(null);
      setAvailableSequences([]);
      setMoveSteps([]);
      const activeColor = typeof mc === 'number' ? mc : myColorRef.current;
      setMessage(cp === activeColor ? 'Your turn' : "Opponent's turn");
    };

    const onGameOver = ({ winner, reason }) => {
      setGameOver(true);
      setGameResult({ winner, reason });
      setMessage(`Game over! ${winner === myColorRef.current ? 'You win!' : 'You lose!'}`);
    };

    const onPlayerLeft = () => {
      setGameOver(true);
      setGameResult({ winner: 'opponent', reason: 'Opponent left' });
      setMessage('Opponent left the game');
    };

    socket.on('moveMade', onMoveMade);
    socket.on('gameState', onGameState);
    socket.on('gameOver', onGameOver);
    socket.on('playerLeft', onPlayerLeft);

    return () => {
      socket.off('moveMade', onMoveMade);
      socket.off('gameState', onGameState);
      socket.off('gameOver', onGameOver);
      socket.off('playerLeft', onPlayerLeft);
    };
  }, [socket, roomCode]);

  const handleSquareClick = (displayRow, displayCol) => {
    if (gameOver || currentPlayer !== myColor || !socket) return;

    const actualRow = myColor === PLAYER_RED ? displayRow : 7 - displayRow;
    const actualCol = myColor === PLAYER_RED ? displayCol : 7 - displayCol;
    const piece = board[actualRow]?.[actualCol];

    if (selectedPiece) {
      const matching = availableSequences.filter(
        (seq) =>
          seq.length > 0 &&
          seq[0].to[0] === actualRow &&
          seq[0].to[1] === actualCol
      );
      if (matching.length > 0) {
        const firstStep = matching[0][0];
        setBoard(applyMoveSequence(board, [firstStep]));
        setSelectedPiece([firstStep.to[0], firstStep.to[1]]);

        const newSteps = [...moveSteps, firstStep];
        setMoveSteps(newSteps);

        const suffixes = matching.map((s) => s.slice(1));
        setAvailableSequences(suffixes);

        if (suffixes.every((s) => s.length === 0)) {
          socket.emit('move', { roomCode, steps: newSteps });
          setSelectedPiece(null);
          setAvailableSequences([]);
          setMoveSteps([]);
        }
        return;
      }
    }

    if (piece && piece.player === myColor) {
      const moves = getValidMoves(board, myColor);
      const seqs = moves
        .filter(
          (m) =>
            m.steps[0].from[0] === actualRow &&
            m.steps[0].from[1] === actualCol
        )
        .map((m) => m.steps);
      if (seqs.length > 0) {
        setSelectedPiece([actualRow, actualCol]);
        setAvailableSequences(seqs);
        setMoveSteps([]);
      } else {
        setSelectedPiece(null);
        setAvailableSequences([]);
        setMoveSteps([]);
      }
    } else {
      setSelectedPiece(null);
      setAvailableSequences([]);
      setMoveSteps([]);
    }
  };

  const isTarget = (r, c) => {
    if (!selectedPiece || availableSequences.length === 0) return false;
    const ar = myColor === PLAYER_RED ? r : 7 - r;
    const ac = myColor === PLAYER_RED ? c : 7 - c;
    return availableSequences.some(
      (s) => s.length > 0 && s[0].to[0] === ar && s[0].to[1] === ac
    );
  };

  const isSelected = (r, c) => {
    if (!selectedPiece) return false;
    const ar = myColor === PLAYER_RED ? r : 7 - r;
    const ac = myColor === PLAYER_RED ? c : 7 - c;
    return selectedPiece[0] === ar && selectedPiece[1] === ac;
  };

  const handleClose = () => {
    if (isLeague && leagueCode) router.push(`/league/${leagueCode}`);
    else router.push('/play');
  };

  const renderSquare = (r, c) => {
    const ar = myColor === PLAYER_RED ? r : 7 - r;
    const ac = myColor === PLAYER_RED ? c : 7 - c;
    const piece = board[ar]?.[ac];
    const isDark = (r + c) % 2 === 1;
    const selected = isSelected(r, c);
    const target = isTarget(r, c);

    return (
      <div
        key={`${r}-${c}`}
        onClick={() => handleSquareClick(r, c)}
        className={`aspect-square w-full relative cursor-pointer
          ${isDark ? 'bg-dark-700' : 'bg-dark-800'}
          ${selected ? 'ring-2 ring-yellow-bright bg-yellow-bright/10' : ''}`}
      >
        {target && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 shadow-md shadow-green-500/50" />
          </div>
        )}
        {piece && (
          <div
            className={`absolute inset-1 sm:inset-1.5 rounded-full flex items-center justify-center
              ${piece.player === PLAYER_RED ? 'bg-red-600 border-red-300' : 'bg-slate-900 border-slate-500'}
              border-2 shadow-lg`}
          >
            <div className="w-2/3 h-2/3 rounded-full border border-white/30 flex items-center justify-center">
              {piece.king && (
                <span className="text-yellow-bright text-sm sm:text-base">★</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex items-center justify-center gap-4 mb-4">
        <span className="text-xl font-bold text-white">{myUsername}</span>
        <span className="text-yellow-bright text-2xl font-black">VS</span>
        <span className="text-xl font-bold text-white">{opponentUsername}</span>
      </div>

      <div className="mb-2 flex items-center gap-2 bg-dark-800 px-3 py-1 rounded-full border border-dark-600">
        <div
          className={`h-2 w-2 rounded-full ${
            currentPlayer === myColor ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-white font-semibold text-sm">{message}</span>
      </div>

      <div
        className="bg-dark-900 p-1 sm:p-2 rounded-xl shadow-xl border border-dark-600"
        style={{ width: 'min(100%, calc(100vh - 140px))', maxWidth: '640px' }}
      >
        <div className="grid grid-cols-8 gap-0 overflow-hidden rounded-lg">
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => renderSquare(r, c))
          )}
        </div>
      </div>

      {gameOver && gameResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 border border-yellow-bright rounded-xl p-6 max-w-sm w-full mx-4 text-center">
            <h3 className="text-2xl font-bold mb-2">Game Over</h3>
            <p className="text-gray-300 mb-2">
              {gameResult.winner === myColor ? 'You win!' : 'You lose!'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Reason: {gameResult.reason}
            </p>
            <Button variant="primary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}