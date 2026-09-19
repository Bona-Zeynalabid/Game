'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  createInitialBoard,
  getValidMoves,
  applyMoveSequence,
  PLAYER_RED,
  PLAYER_BLACK,
} from '@/lib/checkers';
import { getAIMove } from '@/lib/ai';
import Button from './Button';

export default function SoloBoard() {
  const [board, setBoard] = useState(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState(PLAYER_RED);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [availableSequences, setAvailableSequences] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('Your turn (Red)');
  const [isAIThinking, setIsAIThinking] = useState(false);

  const allLegalMoves = useMemo(() => {
    if (gameOver) return [];
    return getValidMoves(board, currentPlayer);
  }, [board, currentPlayer, gameOver]);

  // Game over check
  useEffect(() => {
    if (!gameOver && allLegalMoves.length === 0) {
      setGameOver(true);
      setMessage(currentPlayer === PLAYER_RED ? 'Black wins!' : 'Red wins!');
    }
  }, [allLegalMoves, currentPlayer, gameOver]);

  // AI turn
  useEffect(() => {
    if (currentPlayer === PLAYER_BLACK && !gameOver) {
      setIsAIThinking(true);
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board, PLAYER_BLACK);
        if (aiMove) {
          const newBoard = applyMoveSequence(board, aiMove.steps);
          setBoard(newBoard);
          setCurrentPlayer(PLAYER_RED);
          setMessage('Your turn (Red)');
          setSelectedPiece(null);
          setAvailableSequences([]);
        }
        setIsAIThinking(false);
      }, 500);
      return () => {
        clearTimeout(timer);
        setIsAIThinking(false);
      };
    }
  }, [board, currentPlayer, gameOver]);

  const handleSquareClick = (row, col) => {
    // ... same as before, no changes needed
    if (gameOver || currentPlayer !== PLAYER_RED || isAIThinking) return;

    const piece = board[row][col];

    if (selectedPiece) {
      const matching = availableSequences.filter(
        seq => seq.length > 0 && seq[0].to[0] === row && seq[0].to[1] === col
      );

      if (matching.length > 0) {
        const firstStep = matching[0][0];
        const newBoard = applyMoveSequence(board, [firstStep]);
        setBoard(newBoard);
        setSelectedPiece([firstStep.to[0], firstStep.to[1]]);

        const suffixes = matching.map(seq => seq.slice(1));
        setAvailableSequences(suffixes);

        if (suffixes.every(seq => seq.length === 0)) {
          setSelectedPiece(null);
          setAvailableSequences([]);
          setCurrentPlayer(PLAYER_BLACK);
          setMessage('AI is thinking...');
        }
        return;
      } else {
        if (piece && piece.player === PLAYER_RED) {
          const moves = getValidMoves(board, PLAYER_RED);
          const pieceMoveSequences = moves
            .filter(move => move.steps[0].from[0] === row && move.steps[0].from[1] === col)
            .map(move => move.steps);
          if (pieceMoveSequences.length > 0) {
            setSelectedPiece([row, col]);
            setAvailableSequences(pieceMoveSequences);
          } else {
            setSelectedPiece(null);
            setAvailableSequences([]);
          }
        } else {
          setSelectedPiece(null);
          setAvailableSequences([]);
        }
        return;
      }
    }

    if (piece && piece.player === PLAYER_RED) {
      const moves = getValidMoves(board, PLAYER_RED);
      const pieceMoveSequences = moves
        .filter(move => move.steps[0].from[0] === row && move.steps[0].from[1] === col)
        .map(move => move.steps);
      if (pieceMoveSequences.length > 0) {
        setSelectedPiece([row, col]);
        setAvailableSequences(pieceMoveSequences);
      }
    } else {
      setSelectedPiece(null);
      setAvailableSequences([]);
    }
  };

  const isTarget = (row, col) => {
    if (!selectedPiece || availableSequences.length === 0) return false;
    return availableSequences.some(seq => seq.length > 0 && seq[0].to[0] === row && seq[0].to[1] === col);
  };

  const isSelected = (row, col) => {
    return selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col;
  };

  const resetGame = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer(PLAYER_RED);
    setSelectedPiece(null);
    setAvailableSequences([]);
    setGameOver(false);
    setMessage('Your turn (Red)');
    setIsAIThinking(false);
  };

  const renderSquare = (row, col) => {
    const piece = board[row][col];
    const isDark = (row + col) % 2 === 1;
    const selected = isSelected(row, col);
    const target = isTarget(row, col);

    return (
      <div
        key={`${row}-${col}`}
        onClick={() => handleSquareClick(row, col)}
        className={`
          aspect-square w-full relative cursor-pointer
          ${isDark ? 'bg-dark-700' : 'bg-dark-800'}
          ${selected ? 'ring-2 ring-yellow-bright bg-yellow-bright/10' : ''}
        `}
      >
        {target && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 shadow-md shadow-green-500/50" />
          </div>
        )}
        {piece && (
          <div
            className={`
              absolute inset-1 sm:inset-1.5 rounded-full
              flex items-center justify-center
              ${piece.player === PLAYER_RED ? 'bg-red-600 border-red-300' : 'bg-slate-900 border-slate-500'}
              border-2
              shadow-lg
            `}
          >
            <div className="w-2/3 h-2/3 rounded-full border border-white/30 flex items-center justify-center">
              {piece.king && <span className="text-yellow-bright text-sm sm:text-base">★</span>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Status */}
      <div className="mb-2 flex items-center gap-2 bg-dark-800 px-3 py-1 rounded-full border border-dark-600">
        <div className={`h-2 w-2 rounded-full ${currentPlayer === PLAYER_RED ? 'bg-red-500' : 'bg-slate-400'}`} />
        <span className="text-white font-semibold text-sm">{message}</span>
      </div>

      {/* Board container – responsive to viewport height */}
      <div
        className="bg-dark-900 p-1 sm:p-2 rounded-xl shadow-xl border border-dark-600"
        style={{
          width: 'min(100%, calc(100vh - 140px))',
          maxWidth: '640px',
        }}
      >
        <div className="grid grid-cols-8 gap-0 overflow-hidden rounded-lg">
          {board.map((row, r) => row.map((_, c) => renderSquare(r, c)))}
        </div>
      </div>

      {/* Reset button */}
      <Button
        onClick={resetGame}
        variant="secondary"
        className="mt-3"
        size="sm"
      >
        Reset Game
      </Button>
    </div>
  );
}