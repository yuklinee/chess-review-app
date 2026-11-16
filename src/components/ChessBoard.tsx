import { useMemo } from 'react'
import { Chess } from 'chess.js'
import type { Color, Square } from 'chess.js'
import { PIECE_GLYPHS, PIECE_NAMES } from '../lib/pieces'
import {
  CLASSIFICATION_META,
  analysisMoveTitle,
  type MoveAnalysis,
} from '../lib/analysis'

interface ChessBoardProps {
  fen: string
  orientation: Color
  lastMove: { from: Square; to: Square } | null
  selected: Square | null
  targets: Square[]
  onSquareClick: (square: Square) => void
  arrow?: { from: Square; to: Square } | null
  moveGrade?: { square: Square; analysis: MoveAnalysis } | null
  disabled?: boolean
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const

function buildSquares(orientation: Color): Square[] {
  const files = orientation === 'w' ? FILES : [...FILES].reverse()
  const ranks = orientation === 'w' ? RANKS : [...RANKS].reverse()
  const squares: Square[] = []

  for (const rank of ranks) {
    for (const file of files) {
      squares.push(`${file}${rank}` as Square)
    }
  }

  return squares
}

function squareCenter(
  square: Square,
  orientation: Color,
): { x: number; y: number } {
  const file = square.charCodeAt(0) - 'a'.charCodeAt(0)
  const rank = Number(square[1])
  return {
    x: orientation === 'w' ? file + 0.5 : 7 - file + 0.5,
    y: orientation === 'w' ? 8 - rank + 0.5 : rank - 0.5,
  }
}

interface BoardArrowProps {
  from: Square
  to: Square
  orientation: Color
}

function BoardArrow({ from, to, orientation }: BoardArrowProps) {
  if (from === to) return null

  const start = squareCenter(from, orientation)
  const end = squareCenter(to, orientation)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length

  const lineStartX = start.x + ux * 0.25
  const lineStartY = start.y + uy * 0.25
  const tipX = end.x - ux * 0.18
  const tipY = end.y - uy * 0.18
  const baseX = tipX - ux * 0.34
  const baseY = tipY - uy * 0.34
  const halfWidth = 0.24
  const perpX = -uy * halfWidth
  const perpY = ux * halfWidth

  const arrowHead = [
    `${tipX},${tipY}`,
    `${baseX + perpX},${baseY + perpY}`,
    `${baseX - perpX},${baseY - perpY}`,
  ].join(' ')

  return (
    <svg
      className="board-arrow"
      viewBox="0 0 8 8"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <line
        x1={lineStartX}
        y1={lineStartY}
        x2={baseX}
        y2={baseY}
        stroke="rgba(0, 0, 0, 0.35)"
        strokeWidth={0.3}
        strokeLinecap="round"
      />
      <line
        x1={lineStartX}
        y1={lineStartY}
        x2={baseX}
        y2={baseY}
        stroke="#81b64c"
        strokeWidth={0.19}
        strokeLinecap="round"
        opacity={0.9}
      />
      <polygon
        points={arrowHead}
        fill="#81b64c"
        stroke="rgba(0, 0, 0, 0.28)"
        strokeWidth={0.035}
        opacity={0.92}
      />
    </svg>
  )
}

export function ChessBoard({
  fen,
  orientation,
  lastMove,
  selected,
  targets,
  onSquareClick,
  arrow = null,
  moveGrade = null,
  disabled = false,
}: ChessBoardProps) {
  const chess = useMemo(() => {
    try {
      return new Chess(fen)
    } catch {
      return new Chess()
    }
  }, [fen])

  const squares = useMemo(() => buildSquares(orientation), [orientation])
  const checkSquare = useMemo(() => {
    if (!chess.isCheck()) return null
    return chess.findPiece({ type: 'k', color: chess.turn() })[0] ?? null
  }, [chess])

  return (
    <div
      className={`board${disabled ? ' board--disabled' : ''}`}
      role="group"
      aria-label="Шахматная доска"
    >
      {squares.map((square, index) => {
        const piece = chess.get(square)
        const isLight = chess.squareColor(square) === 'light'
        const isSelected = selected === square
        const isTarget = targets.includes(square)
        const isCapture = isTarget && Boolean(piece)
        const isLast =
          Boolean(lastMove) &&
          (lastMove?.from === square || lastMove?.to === square)
        const isCheck = checkSquare === square
        const showRank = index % 8 === 0
        const showFile = index >= 56
        const grade =
          moveGrade?.square === square ? moveGrade.analysis : null
        const label = piece
          ? `${square}, ${piece.color === 'w' ? 'белая' : 'чёрная'} ${PIECE_NAMES[piece.type]}${
              grade
                ? `, ${CLASSIFICATION_META[grade.classification].title}`
                : ''
            }`
          : `${square}, пустая клетка`

        return (
          <button
            key={square}
            type="button"
            className={`square ${isLight ? 'square--light' : 'square--dark'}${
              isLast ? ' square--last' : ''
            }${isSelected ? ' square--selected' : ''}`}
            onClick={() => onSquareClick(square)}
            aria-label={label}
            aria-pressed={isSelected}
            data-square={square}
          >
            {isLast ? <span className="square__last" aria-hidden="true" /> : null}
            {isSelected ? (
              <span className="square__selected" aria-hidden="true" />
            ) : null}
            {isCheck ? <span className="square__check" aria-hidden="true" /> : null}
            {piece ? (
              <span
                className={`piece piece--${piece.color}`}
                aria-hidden="true"
              >
                {PIECE_GLYPHS[piece.type]}
              </span>
            ) : null}
            {isTarget ? (
              <span
                className={`square__target${
                  isCapture ? ' square__target--capture' : ''
                }`}
                aria-hidden="true"
              />
            ) : null}
            {grade ? (
              <span
                className={`board-grade board-grade--${grade.classification}`}
                title={analysisMoveTitle(grade)}
                aria-hidden="true"
              >
                {CLASSIFICATION_META[grade.classification].symbol}
              </span>
            ) : null}
            {showRank ? (
              <span
                className={`coord coord--rank ${
                  isLight ? 'coord--on-light' : 'coord--on-dark'
                }`}
                aria-hidden="true"
              >
                {square[1]}
              </span>
            ) : null}
            {showFile ? (
              <span
                className={`coord coord--file ${
                  isLight ? 'coord--on-light' : 'coord--on-dark'
                }`}
                aria-hidden="true"
              >
                {square[0]}
              </span>
            ) : null}
          </button>
        )
      })}
      {arrow ? (
        <BoardArrow
          from={arrow.from}
          to={arrow.to}
          orientation={orientation}
        />
      ) : null}
    </div>
  )
}
