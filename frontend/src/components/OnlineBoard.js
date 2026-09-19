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
  isLeague = false,       // new prop
  leagueCode = null,      // new prop
}) {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard || createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState(initialCurrentPlayer || PLAYER_RED);
  const [myColor, setMyColor] = useState(initialMyColor);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [availableSequences, setAvailableSequences] = useState([]);
  const [moveSteps, setMoveSteps] = useState([]);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  const boardRef = useRef(board);
  const currentPlayerRef = useRef(currentPlayer);
  const selectedPieceRef = useRef(selectedPiece);
  const availableSequencesRef = useRef(availableSequences);
  const moveStepsRef = useRef(moveSteps);
  const myColorRef = useRef(myColor);
  const roomCodeRef = useRef(roomCode);
  const gameOverRef = useRef(gameOver);

  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);
  useEffect(() => { selectedPieceRef.current = selectedPiece; }, [selectedPiece]);
  useEffect(() => { availableSequencesRef.current = availableSequences; }, [availableSequences]);
  useEffect(() => { moveStepsRef.current = moveSteps; }, [moveSteps]);
  useEffect(() => { myColorRef.current = myColor; }, [myColor]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  useEffect(() => {
    if (initialCurrentPlayer === initialMyColor) {
      setMessage('Your turn');
    } else {
      setMessage("Opponent's turn");
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMoveMade = ({ board: newBoard, currentPlayer: newTurn }) => {
      setBoard(newBoard);
      setCurrentPlayer(newTurn);
      setSelectedPiece(null);
      setAvailableSequences([]);
      setMoveSteps([]);
      setMessage(newTurn === myColorRef.current ? 'Your turn' : "Opponent's turn");
    };

    const handleGameState = ({ board: newBoard, currentPlayer: newTurn, myColor: newMyColor }) => {
      setBoard(newBoard);
      setCurrentPlayer(newTurn);
      setMyColor(newMyColor);
      setSelectedPiece(null);
      setAvailableSequences([]);
      setMoveSteps([]);
      setMessage(newTurn === newMyColor ? 'Your turn' : "Opponent's turn");
    };

    const handleGameOver = ({ winner, reason }) => {
      setGameOver(true);
      setGameResult({ winner, reason });
      setMessage(`Game over! ${winner === myColorRef.current ? 'You win!' : 'You lose!'}`);
    };

    const handlePlayerLeft = () => {
      setGameOver(true);
      setGameResult({ winner: 'opponent', reason: 'Opponent left' });
      setMessage('Opponent left the game');
    };

    socket.on('moveMade', handleMoveMade);
    socket.on('gameState', handleGameState);
    socket.on('gameOver', handleGameOver);
    socket.on('playerLeft', handlePlayerLeft);

    return () => {
      socket.off('moveMade', handleMoveMade);
      socket.off('gameState', handleGameState);
      socket.off('gameOver', handleGameOver);
      socket.off('playerLeft', handlePlayerLeft);
    };
  }, [socket, roomCode]);

  const handleSquareClick = (displayRow, displayCol) => {
    if (gameOver || currentPlayer !== myColor || !socket) return;

    const actualRow = myColor === PLAYER_RED ? displayRow : 7 - displayRow;
    const actualCol = myColor === PLAYER_RED ? displayCol : 7 - displayCol;
    const piece = board[actualRow]?.[actualCol];

    if (selectedPiece) {
      const matching = availableSequences.filter(
        seq => seq.length > 0 && seq[0].to[0] === actualRow && seq[0].to[1] === actualCol
      );
      if (matching.length > 0) {
        const firstStep = matching[0][0];
        const newBoard = applyMoveSequence(board, [firstStep]);
        setBoard(newBoard);
        setSelectedPiece([firstStep.to[0], firstStep.to[1]]);

        const newSteps = [...moveSteps, firstStep];
        setMoveSteps(newSteps);

        const suffixes = matching.map(seq => seq.slice(1));
        setAvailableSequences(suffixes);

        if (suffixes.every(seq => seq.length === 0)) {
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
      const pieceMoveSequences = moves
        .filter(move => move.steps[0].from[0] === actualRow && move.steps[0].from[1] === actualCol)
        .map(move => move.steps);
      if (pieceMoveSequences.length > 0) {
        setSelectedPiece([actualRow, actualCol]);
        setAvailableSequences(pieceMoveSequences);
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

  const isTarget = (displayRow, displayCol) => {
    if (!selectedPiece || availableSequences.length === 0) return false;
    const actualRow = myColor === PLAYER_RED ? displayRow : 7 - displayRow;
    const actualCol = myColor === PLAYER_RED ? displayCol : 7 - displayCol;
    return availableSequences.some(seq => seq.length > 0 && seq[0].to[0] === actualRow && seq[0].to[1] === actualCol);
  };

  const isSelected = (displayRow, displayCol) => {
    if (!selectedPiece) return false;
    const actualRow = myColor === PLAYER_RED ? displayRow : 7 - displayRow;
    const actualCol = myColor === PLAYER_RED ? displayCol : 7 - displayCol;
    return selectedPiece[0] === actualRow && selectedPiece[1] === actualCol;
  };

  const renderSquare = (displayRow, displayCol) => {
    const actualRow = myColor === PLAYER_RED ? displayRow : 7 - displayRow;
    const actualCol = myColor === PLAYER_RED ? displayCol : 7 - displayCol;
    const piece = board[actualRow]?.[actualCol];
    const isDark = (displayRow + displayCol) % 2 === 1;
    const selected = isSelected(displayRow, displayCol);
    const target = isTarget(displayRow, displayCol);

    return (
      <div
        key={`${displayRow}-${displayCol}`}
        onClick={() => handleSquareClick(displayRow, displayCol)}
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
          <div className={`absolute inset-1 sm:inset-1.5 rounded-full flex items-center justify-center
            ${piece.player === PLAYER_RED ? 'bg-red-600 border-red-300' : 'bg-slate-900 border-slate-500'}
            border-2 shadow-lg`}
          >
            <div className="w-2/3 h-2/3 rounded-full border border-white/30 flex items-center justify-center">
              {piece.king && <span className="text-yellow-bright text-sm sm:text-base">★</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleClose = () => {
    if (isLeague && leagueCode) {
      router.push(`/league/${leagueCode}`);
    } else {
      router.push('/play');
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex items-center justify-center gap-4 mb-4">
        <span className="text-xl font-bold text-white">{myUsername}</span>
        <span className="text-yellow-bright text-2xl font-black">VS</span>
        <span className="text-xl font-bold text-white">{opponentUsername}</span>
      </div>

      <div className="mb-2 flex items-center gap-2 bg-dark-800 px-3 py-1 rounded-full border border-dark-600">
        <div className={`h-2 w-2 rounded-full ${currentPlayer === myColor ? 'bg-green-500' : 'bg-red-500'}`} />
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
            <p className="text-sm text-gray-400 mb-4">Reason: {gameResult.reason}</p>
            <Button variant="primary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}