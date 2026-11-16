import { Chess } from 'chess.js'
import type { Color, PieceSymbol } from 'chess.js'
import type { ChessComGame } from '../types/chesscom'
import type { MoveNode } from './pgn'
import type { EngineScore, SearchResult } from './stockfish'
import { gameOutcome } from './format'

export type MoveClassification =
  | 'brilliant'
  | 'best'
  | 'great'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'

export const CLASSIFICATION_META: Record<
  MoveClassification,
  { label: string; symbol: string; title: string }
> = {
  brilliant: { label: 'Блестящий', symbol: '!!', title: 'Блестящий ход' },
  best: { label: 'Лучший', symbol: '★', title: 'Лучший ход' },
  great: { label: 'Отличный', symbol: '!', title: 'Отличный ход' },
  inaccuracy: { label: 'Неточность', symbol: '?!', title: 'Неточность' },
  mistake: { label: 'Ошибка', symbol: '?', title: 'Ошибка' },
  blunder: { label: 'Зевок', symbol: '??', title: 'Зевок' },
}

export const CLASSIFICATION_ORDER: MoveClassification[] = [
  'brilliant',
  'best',
  'great',
  'inaccuracy',
  'mistake',
  'blunder',
]

export interface PositionEvaluation {
  turn: Color
  /** Centipawns from White's point of view. Null when mate is known. */
  cp: number | null
  /** Signed mate distance from White's point of view (+ = White mates). */
  mate: number | null
  bestMoveUci: string | null
  depth: number
  pv: string[]
}

export interface MoveAnalysis {
  index: number
  color: Color
  classification: MoveClassification
  lossCp: number
  accuracy: number
  bestMoveUci: string | null
}

export interface SideAccuracy {
  white: number | null
  black: number | null
}

export interface SidePerformance {
  white: number | null
  black: number | null
}

export interface GameAnalysis {
  moves: (MoveAnalysis | null)[]
  accuracy: SideAccuracy
  performance: SidePerformance
  counts: { white: number; black: number }
}

export interface FormattedEvaluation {
  text: string
  tone: 'white' | 'black' | 'equal'
  detail: string
}

const MATE_SCORE = 10_000
const ACCURACY_MODEL_A = 103.1668
const ACCURACY_MODEL_B = 0.04354
const ACCURACY_MODEL_C = 3.1669

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
}

export function turnFromFen(fen: string): Color {
  try {
    return new Chess(fen).turn()
  } catch {
    return 'w'
  }
}

function terminalScore(fen: string): EngineScore | null {
  try {
    const chess = new Chess(fen)
    if (chess.isCheckmate()) return { type: 'mate', value: 0 }
    if (chess.isGameOver()) return { type: 'cp', value: 0 }
  } catch {
    // Invalid FEN: leave the score empty.
  }
  return null
}

export function normalizeEvaluation(
  result: SearchResult,
  fen: string,
): PositionEvaluation {
  const turn = turnFromFen(fen)
  const score = result.score ?? terminalScore(fen)

  if (!score) {
    return {
      turn,
      cp: null,
      mate: null,
      bestMoveUci: result.bestMoveUci,
      depth: result.depth,
      pv: result.pv,
    }
  }

  if (score.type === 'cp') {
    return {
      turn,
      cp: turn === 'w' ? score.value : -score.value,
      mate: null,
      bestMoveUci: result.bestMoveUci,
      depth: result.depth,
      pv: result.pv,
    }
  }

  return {
    turn,
    cp: null,
    mate: turn === 'w' ? score.value : -score.value,
    bestMoveUci: result.bestMoveUci,
    depth: result.depth,
    pv: result.pv,
  }
}

/** Converts any evaluation to a comparable, White-relative centipawn value. */
export function evaluationToCp(
  evaluation: PositionEvaluation | null,
): number | null {
  if (!evaluation) return null

  if (evaluation.mate !== null) {
    if (evaluation.mate === 0) {
      // The side to move is already checkmated.
      return evaluation.turn === 'w' ? -MATE_SCORE : MATE_SCORE
    }
    const distance = Math.min(99, Math.abs(evaluation.mate))
    const magnitude = MATE_SCORE - distance * 20
    return evaluation.mate > 0 ? magnitude : -magnitude
  }

  return evaluation.cp
}

/** White's winning probability in percent (Lichess-style logistic curve). */
export function whiteWinPercent(evaluation: PositionEvaluation | null): number {
  const cp = evaluationToCp(evaluation)
  if (cp === null) return 50
  const probability = 100 / (1 + Math.exp(-0.00368208 * cp))
  return Math.max(0, Math.min(100, probability))
}

export function formatEvaluation(
  evaluation: PositionEvaluation | null,
): FormattedEvaluation {
  if (!evaluation) {
    return {
      text: '—',
      tone: 'equal',
      detail: 'Оценка ещё не рассчитана',
    }
  }

  if (evaluation.mate !== null) {
    if (evaluation.mate === 0) {
      const whiteMated = evaluation.turn === 'w'
      return {
        text: 'Мат',
        tone: whiteMated ? 'black' : 'white',
        detail: whiteMated ? 'Белые получили мат' : 'Чёрные получили мат',
      }
    }

    const distance = Math.abs(evaluation.mate)
    const whiteMates = evaluation.mate > 0
    return {
      text: whiteMates ? `Мат в ${distance}` : `−Мат в ${distance}`,
      tone: whiteMates ? 'white' : 'black',
      detail: whiteMates
        ? `Белые ставят мат в ${distance}`
        : `Чёрные ставят мат в ${distance}`,
    }
  }

  if (evaluation.cp === null) {
    return {
      text: '—',
      tone: 'equal',
      detail: 'Оценка ещё не рассчитана',
    }
  }

  const pawns = evaluation.cp / 100
  const text =
    pawns === 0
      ? '0.0'
      : `${pawns > 0 ? '+' : '−'}${Math.abs(pawns).toFixed(1)}`
  const tone = evaluation.cp > 20 ? 'white' : evaluation.cp < -20 ? 'black' : 'equal'
  const detail =
    tone === 'white'
      ? `Белые лучше на ${Math.abs(pawns).toFixed(1)} пешки`
      : tone === 'black'
        ? `Чёрные лучше на ${Math.abs(pawns).toFixed(1)} пешки`
        : 'Примерное равенство'

  return { text, tone, detail }
}

/**
 * Accuracy of a single move based on the drop in the mover's win probability.
 * The constants are the public Lichess accuracy model.
 */
export function calculateMoveAccuracy(
  before: PositionEvaluation,
  after: PositionEvaluation,
  mover: Color,
): number {
  const beforeWhite = whiteWinPercent(before)
  const afterWhite = whiteWinPercent(after)
  const beforeMover = mover === 'w' ? beforeWhite : 100 - beforeWhite
  const afterMover = mover === 'w' ? afterWhite : 100 - afterWhite
  const drop = Math.max(0, beforeMover - afterMover)
  const accuracy =
    ACCURACY_MODEL_A * Math.exp(-ACCURACY_MODEL_B * drop) - ACCURACY_MODEL_C
  return Math.max(0, Math.min(100, accuracy))
}

export function classifyMove(
  lossCp: number,
  playedBestMove: boolean,
): MoveClassification {
  if (playedBestMove || lossCp <= 10) return 'best'
  if (lossCp <= 40) return 'great'
  if (lossCp <= 90) return 'inaccuracy'
  if (lossCp <= 200) return 'mistake'
  return 'blunder'
}

/**
 * Approximates Chess.com's "brilliant" badge: a best/near-best move that
 * deliberately leaves material hanging but keeps a clearly winning evaluation.
 * The moved piece must be a real piece (not a king/pawn), and the opponent must
 * have a legal capture that would win material (a lower-value attacker or an
 * undefended piece).
 */
export function isBrilliantMove(
  move: MoveNode,
  after: PositionEvaluation,
  playedBestMove: boolean,
  lossCp: number,
): boolean {
  if (!playedBestMove && lossCp > 10) return false

  let afterChess: Chess
  try {
    afterChess = new Chess(move.after)
  } catch {
    return false
  }

  if (after.turn === move.color) return false

  const movedPiece = afterChess.get(move.to)
  if (!movedPiece || movedPiece.color !== move.color) return false
  if (movedPiece.type === 'k' || movedPiece.type === 'p') return false

  const movedValue = PIECE_VALUES[movedPiece.type]
  const defenders = afterChess
    .attackers(move.to, move.color)
    .filter((square) => square !== move.to)

  const captures = afterChess
    .moves({ verbose: true })
    .filter((capture) => capture.to === move.to && capture.captured)

  if (captures.length === 0) return false

  const sacrifice = captures.some((capture) => {
    if (capture.piece === 'k') return true
    if (defenders.length === 0) return true
    return PIECE_VALUES[capture.piece] < movedValue
  })

  if (!sacrifice) return false

  const afterCp = evaluationToCp(after)
  if (afterCp === null) return false
  const moverCp = move.color === 'w' ? afterCp : -afterCp

  return moverCp >= 100
}

export function formatLoss(lossCp: number): string {
  if (lossCp < 10) return 'без потерь'
  const pawns = lossCp / 100
  return `−${pawns.toFixed(pawns >= 10 ? 0 : 1).replace('.', ',')}`
}

export function analysisMoveTitle(move: MoveAnalysis): string {
  const meta = CLASSIFICATION_META[move.classification]
  return `${meta.title}: ${formatLoss(move.lossCp)}`
}

export function formatAccuracy(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function estimatePerformance(
  accuracy: number | null,
  opponentRating: number | undefined,
  resultScore: number,
): number | null {
  if (accuracy === null || typeof opponentRating !== 'number') return null

  const estimate =
    opponentRating +
    800 * (resultScore - 0.5) +
    (accuracy - 75) * 4

  return Math.round(Math.max(400, Math.min(3000, estimate)))
}

function resultScoreFor(game: ChessComGame, color: Color): number {
  const outcome = gameOutcome(game)
  if (outcome === 'draw') return 0.5
  return (outcome === 'white' && color === 'w') ||
    (outcome === 'black' && color === 'b')
    ? 1
    : 0
}

/**
 * Turns per-position Stockfish evaluations into move grades, accuracy and an
 * approximate performance rating for both sides.
 */
export function buildGameAnalysis(
  evaluations: (PositionEvaluation | null)[],
  moves: MoveNode[],
  game: ChessComGame,
): GameAnalysis {
  const analyzedMoves: (MoveAnalysis | null)[] = moves.map((move, index) => {
    const before = evaluations[index] ?? null
    const after = evaluations[index + 1] ?? null
    if (!before || !after) return null

    const beforeCp = evaluationToCp(before)
    const afterCp = evaluationToCp(after)
    if (beforeCp === null || afterCp === null) return null

    const mover = move.color
    const lossCp = Math.max(
      0,
      mover === 'w' ? beforeCp - afterCp : afterCp - beforeCp,
    )
    const playedUci = `${move.from}${move.to}${move.promotion ?? ''}`
    const playedBest =
      before.bestMoveUci !== null && before.bestMoveUci === playedUci
    const classification = isBrilliantMove(move, after, playedBest, lossCp)
      ? 'brilliant'
      : classifyMove(lossCp, playedBest)

    return {
      index,
      color: mover,
      classification,
      lossCp,
      accuracy: calculateMoveAccuracy(before, after, mover),
      bestMoveUci: before.bestMoveUci,
    }
  })

  const whiteMoves = analyzedMoves.filter(
    (move): move is MoveAnalysis => move !== null && move.color === 'w',
  )
  const blackMoves = analyzedMoves.filter(
    (move): move is MoveAnalysis => move !== null && move.color === 'b',
  )

  const accuracy: SideAccuracy = {
    white: average(whiteMoves.map((move) => move.accuracy)),
    black: average(blackMoves.map((move) => move.accuracy)),
  }

  const performance: SidePerformance = {
    white: estimatePerformance(
      accuracy.white,
      game.black.rating,
      resultScoreFor(game, 'w'),
    ),
    black: estimatePerformance(
      accuracy.black,
      game.white.rating,
      resultScoreFor(game, 'b'),
    ),
  }

  return {
    moves: analyzedMoves,
    accuracy,
    performance,
    counts: { white: whiteMoves.length, black: blackMoves.length },
  }
}
