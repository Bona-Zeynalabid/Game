import {
  getValidMoves,
  applyMoveSequence,
  evaluateBoard,
  isGameOver,
  getOpponent,
} from './checkers';

const MAX_DEPTH = 4; // adjust for difficulty (3 = easy, 4 = medium, 5 = hard)

export function getAIMove(board, aiPlayer) {
  const { bestMove } = minimax(board, MAX_DEPTH, aiPlayer, -Infinity, Infinity, true);
  return bestMove;
}

function minimax(board, depth, player, alpha, beta, maximizing) {
  if (depth === 0 || isGameOver(board, player)) {
    return { score: evaluateBoard(board, player) };
  }

  const moves = getValidMoves(board, player);
  if (moves.length === 0) {
    return { score: maximizing ? -Infinity : Infinity };
  }

  let bestMove = null;

  if (maximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const newBoard = applyMoveSequence(board, move.steps);
      const result = minimax(newBoard, depth - 1, getOpponent(player), alpha, beta, false);
      if (result.score > maxScore) {
        maxScore = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      const newBoard = applyMoveSequence(board, move.steps);
      const result = minimax(newBoard, depth - 1, getOpponent(player), alpha, beta, true);
      if (result.score < minScore) {
        minScore = result.score;
        bestMove = move;
      }
      beta = Math.min(beta, result.score);
      if (beta <= alpha) break;
    }
    return { score: minScore, bestMove };
  }
}