import { useMemo } from 'react'
import { Chess } from 'chess.js'
import type { Color, Square } from 'chess.js'
import { PIECE_GLYPHS, PIECE_NAMES } from '../lib/pieces'

interface ChessBoardProps {
  fen: string
  orientation: Color
  lastMove: { from: Square; to: Square } | null
  selected: Square | null
  targets: Square[]
  onSquareClick: (square: Square) => void
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

export function ChessBoard({
  fen,
  orientation,
  lastMove,
  selected,
  targets,
  onSquareClick,
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
        const label = piece
          ? `${square}, ${piece.color === 'w' ? 'белая' : 'чёрная'} ${PIECE_NAMES[piece.type]}`
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
    </div>
  )
}
