import { Chess, DEFAULT_POSITION } from 'chess.js'
import type { Color, Move, PieceSymbol, Square } from 'chess.js'

export interface MoveNode {
  san: string
  from: Square
  to: Square
  piece: PieceSymbol
  color: Color
  captured?: PieceSymbol
  promotion?: PieceSymbol
  before: string
  after: string
  moveNumber: number
  isCheck: boolean
  isCheckmate: boolean
}

export interface ParsedGame {
  moves: MoveNode[]
  startFen: string
  headers: Record<string, string>
}

function toMoveNode(move: Move): MoveNode {
  const fullMove = Number.parseInt(move.before.split(' ')[5] ?? '1', 10)
  return {
    san: move.san,
    from: move.from,
    to: move.to,
    piece: move.piece,
    color: move.color,
    captured: move.captured,
    promotion: move.promotion,
    before: move.before,
    after: move.after,
    moveNumber: Number.isFinite(fullMove) ? fullMove : 1,
    isCheck: move.san.includes('+'),
    isCheckmate: move.san.includes('#'),
  }
}

/**
 * Parses a Chess.com PGN into a list of moves with the FEN before and after
 * every move. Throws when chess.js cannot parse the notation.
 */
export function parseGamePgn(pgn: string): ParsedGame {
  const chess = new Chess()
  chess.loadPgn(pgn)

  const verboseMoves = chess.history({ verbose: true })
  const moves = verboseMoves.map(toMoveNode)
  const headers = chess.getHeaders()

  return {
    moves,
    startFen: moves[0]?.before ?? headers.FEN ?? DEFAULT_POSITION,
    headers,
  }
}

/** Builds a move node from a move that was played interactively on the board. */
export function createMoveNode(move: Move): MoveNode {
  return toMoveNode(move)
}

export interface PositionInfo {
  turn: Color
  fen: string
  status: string
  isCheck: boolean
  isCheckmate: boolean
  isDraw: boolean
  checkSquare: Square | null
}

export function describePosition(chess: Chess): PositionInfo {
  const turn = chess.turn()
  const checkSquare = chess.isCheck()
    ? (chess.findPiece({ type: 'k', color: turn })[0] ?? null)
    : null

  let status: string
  if (chess.isCheckmate()) {
    status = turn === 'w' ? 'Мат. Победа чёрных' : 'Мат. Победа белых'
  } else if (chess.isStalemate()) {
    status = 'Пат'
  } else if (chess.isInsufficientMaterial()) {
    status = 'Ничья: мало материала'
  } else if (chess.isThreefoldRepetition()) {
    status = 'Ничья: повторение позиции'
  } else if (chess.isDrawByFiftyMoves()) {
    status = 'Ничья: правило 50 ходов'
  } else if (chess.isDraw()) {
    status = 'Ничья'
  } else if (chess.isCheck()) {
    status = turn === 'w' ? 'Шах белым королю' : 'Шах чёрному королю'
  } else {
    status = turn === 'w' ? 'Ход белых' : 'Ход чёрных'
  }

  return {
    turn,
    fen: chess.fen(),
    status,
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    checkSquare,
  }
}
