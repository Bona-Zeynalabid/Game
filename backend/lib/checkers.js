export const BOARD_SIZE = 8;
export const PLAYER_RED = 1;
export const PLAYER_BLACK = 2;

function createPiece(player, king = false) {
  return { player, king };
}

export function createInitialBoard() {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        if (row < 3) board[row][col] = createPiece(PLAYER_BLACK);
        else if (row > 4) board[row][col] = createPiece(PLAYER_RED);
      }
    }
  }
  return board;
}

function cloneBoard(board) {
  return board.map(row => row.map(piece => (piece ? { ...piece } : null)));
}

function isInside(r, c) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function getOpponent(player) {
  return player === PLAYER_RED ? PLAYER_BLACK : PLAYER_RED;
}

const DIRECTIONS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function getSimpleMoves(board, r, c) {
  const piece = board[r][c];
  if (!piece) return [];
  const moves = [];

  if (!piece.king) {
    const dirs = piece.player === PLAYER_RED ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (isInside(nr, nc) && !board[nr][nc]) {
        moves.push({ from: [r, c], to: [nr, nc] });
      }
    }
  } else {
    // Flying king: slide any distance diagonally
    for (const [dr, dc] of DIRECTIONS) {
      let nr = r + dr, nc = c + dc;
      while (isInside(nr, nc) && !board[nr][nc]) {
        moves.push({ from: [r, c], to: [nr, nc] });
        nr += dr;
        nc += dc;
      }
    }
  }
  return moves;
}

function getCaptureSequences(board, r, c, capturedPositions = new Set()) {
  const piece = board[r][c];
  if (!piece) return [];

  const enemy = getOpponent(piece.player);
  const captures = [];

  if (!piece.king) {
    // Regular piece: jump adjacent enemy to empty square immediately beyond
    const dirs = piece.player === PLAYER_RED ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
    for (const [dr, dc] of dirs) {
      const er = r + dr, ec = c + dc;
      const lr = r + 2 * dr, lc = c + 2 * dc;
      if (
        isInside(er, ec) &&
        isInside(lr, lc) &&
        board[er][ec] &&
        board[er][ec].player === enemy &&
        !board[lr][lc] &&
        !capturedPositions.has(`${er},${ec}`)
      ) {
        captures.push({ from: [r, c], to: [lr, lc], captured: [er, ec] });
      }
    }
  } else {
    // Flying king: scan diagonals for first enemy, then any empty square beyond
    for (const [dr, dc] of DIRECTIONS) {
      let nr = r + dr, nc = c + dc;
      while (isInside(nr, nc) && !board[nr][nc]) {
        nr += dr;
        nc += dc;
      }
      if (!isInside(nr, nc)) continue;
      const firstPiece = board[nr][nc];
      if (firstPiece.player === enemy && !capturedPositions.has(`${nr},${nc}`)) {
        let lr = nr + dr, lc = nc + dc;
        while (isInside(lr, lc) && !board[lr][lc]) {
          captures.push({ from: [r, c], to: [lr, lc], captured: [nr, nc] });
          lr += dr;
          lc += dc;
        }
      }
    }
  }

  const sequences = [];
  for (const capture of captures) {
    const newBoard = cloneBoard(board);
    const movingPiece = newBoard[r][c];
    newBoard[r][c] = null;
    newBoard[capture.to[0]][capture.to[1]] = movingPiece;
    newBoard[capture.captured[0]][capture.captured[1]] = null;

    // Promote if reaches end
    if (movingPiece.player === PLAYER_RED && capture.to[0] === 0) {
      movingPiece.king = true;
    } else if (movingPiece.player === PLAYER_BLACK && capture.to[0] === BOARD_SIZE - 1) {
      movingPiece.king = true;
    }

    const newCaptured = new Set(capturedPositions);
    newCaptured.add(`${capture.captured[0]},${capture.captured[1]}`);

    const subSequences = getCaptureSequences(newBoard, capture.to[0], capture.to[1], newCaptured);
    if (subSequences.length === 0) {
      sequences.push([capture]);
    } else {
      for (const sub of subSequences) {
        sequences.push([capture, ...sub]);
      }
    }
  }
  return sequences;
}

export function getValidMoves(board, player) {
  const pieces = getPieces(board, player);
  let captureSequences = [];
  let simpleMoves = [];

  for (const [r, c] of pieces) {
    const pieceCaptures = getCaptureSequences(board, r, c);
    if (pieceCaptures.length > 0) {
      captureSequences = captureSequences.concat(pieceCaptures.map(steps => ({ steps })));
    }
    if (captureSequences.length === 0) {
      const moves = getSimpleMoves(board, r, c);
      for (const move of moves) {
        simpleMoves.push({ steps: [move] });
      }
    }
  }

  return captureSequences.length > 0 ? captureSequences : simpleMoves;
}

export function getPieces(board, player) {
  const pieces = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] && board[r][c].player === player) pieces.push([r, c]);
    }
  }
  return pieces;
}

export function applyMoveSequence(board, steps) {
  let newBoard = cloneBoard(board);
  for (const step of steps) {
    const piece = newBoard[step.from[0]][step.from[1]];
    newBoard[step.from[0]][step.from[1]] = null;
    newBoard[step.to[0]][step.to[1]] = piece;
    if (step.captured) {
      newBoard[step.captured[0]][step.captured[1]] = null;
    }
    if (piece.player === PLAYER_RED && step.to[0] === 0) piece.king = true;
    else if (piece.player === PLAYER_BLACK && step.to[0] === BOARD_SIZE - 1) piece.king = true;
  }
  return newBoard;
}

export function evaluateBoard(board, player) {
  let score = 0;
  const opponent = getOpponent(player);
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      const value = piece.king ? 3 : 1;
      if (piece.player === player) {
        score += value;
        if (player === PLAYER_RED) score += (BOARD_SIZE - 1 - r) * 0.1;
        else score += r * 0.1;
      } else {
        score -= value;
        if (opponent === PLAYER_RED) score -= (BOARD_SIZE - 1 - r) * 0.1;
        else score -= r * 0.1;
      }
    }
  }
  return score;
}

export function isGameOver(board, player) {
  return getValidMoves(board, player).length === 0;
}