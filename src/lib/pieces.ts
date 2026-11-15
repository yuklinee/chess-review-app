import type { PieceSymbol } from 'chess.js'

export const PIECE_GLYPHS: Record<PieceSymbol, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
}

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  k: 'король',
  q: 'ферзь',
  r: 'ладья',
  b: 'слон',
  n: 'конь',
  p: 'пешка',
}
