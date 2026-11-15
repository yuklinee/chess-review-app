import { useCallback, useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import type { Move, PieceSymbol, Square } from 'chess.js'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  FlipVertical2,
  Keyboard,
  Sparkles,
  Trophy,
} from 'lucide-react'
import type { ChessComGame, PlayerColor } from '../types/chesscom'
import type { MoveNode, ParsedGame } from '../lib/pgn'
import { createMoveNode, describePosition } from '../lib/pgn'
import {
  TIME_CLASS_LABELS,
  formatDateTime,
  formatMovesCount,
  formatOpening,
  formatResultCode,
  formatScore,
  formatTermination,
  formatTimeControl,
  gameOutcome,
  playerColor,
} from '../lib/format'
import { ChessBoard } from './ChessBoard'
import { MoveList } from './MoveList'
import { PIECE_GLYPHS, PIECE_NAMES } from '../lib/pieces'

interface GameScreenProps {
  game: ChessComGame
  playerUsername: string
  onBack: () => void
  parsed: ParsedGame
}

interface PlayerBarProps {
  username: string
  rating?: number
  result: string
  color: PlayerColor
  isYou: boolean
  isWinner: boolean
}

function PlayerBar({
  username,
  rating,
  result,
  color,
  isYou,
  isWinner,
}: PlayerBarProps) {
  return (
    <div
      className={`player-bar player-bar--${color}${
        isYou ? ' player-bar--you' : ''
      }`}
    >
      <span className={`player-bar__swatch player-bar__swatch--${color}`}>
        {color === 'white' ? '♔' : '♚'}
      </span>
      <span className="player-bar__name">
        {username}
        {isYou ? <span className="you-badge">вы</span> : null}
      </span>
      <span className="player-bar__rating">
        {typeof rating === 'number' ? rating : '—'}
      </span>
      <span
        className={`player-bar__result${
          isWinner ? ' player-bar__result--win' : ''
        }`}
      >
        {isWinner ? <Trophy size={13} aria-hidden="true" /> : null}
        {formatResultCode(result)}
      </span>
    </div>
  )
}

interface PromotionPickerProps {
  color: PlayerColor
  onSelect: (piece: PieceSymbol) => void
  onCancel: () => void
}

const PROMOTION_PIECES: PieceSymbol[] = ['q', 'r', 'b', 'n']

function PromotionPicker({ color, onSelect, onCancel }: PromotionPickerProps) {
  return (
    <div className="promotion" role="dialog" aria-label="Превращение пешки">
      <div className="promotion__card">
        <p className="promotion__title">Превращение пешки</p>
        <div className="promotion__options">
          {PROMOTION_PIECES.map((piece) => (
            <button
              key={piece}
              type="button"
              className="promotion__option"
              onClick={() => onSelect(piece)}
              aria-label={PIECE_NAMES[piece]}
            >
              <span
                className={`piece piece--${color === 'white' ? 'w' : 'b'}`}
                aria-hidden="true"
              >
                {PIECE_GLYPHS[piece]}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="promotion__cancel"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </div>
  )
}

export function GameReview({
  game,
  playerUsername,
  onBack,
  parsed,
}: GameScreenProps) {
  const yourColor = playerColor(game, playerUsername)
  const [orientation, setOrientation] = useState<PlayerColor>(
    yourColor ?? 'white',
  )
  const [moves, setMoves] = useState<MoveNode[]>(parsed.moves)
  const [ply, setPly] = useState(0)
  const [variationFrom, setVariationFrom] = useState<number | null>(null)
  const [selected, setSelected] = useState<Square | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square
    to: Square
  } | null>(null)

  const currentFen =
    ply === 0 ? parsed.startFen : (moves[ply - 1]?.after ?? parsed.startFen)

  const position = useMemo(() => {
    try {
      return new Chess(currentFen)
    } catch {
      return new Chess()
    }
  }, [currentFen])

  const info = useMemo(() => describePosition(position), [position])

  const legalTargets = useMemo<Square[]>(() => {
    if (!selected) return []
    try {
      return position
        .moves({ square: selected, verbose: true })
        .map((move) => move.to)
    } catch {
      return []
    }
  }, [position, selected])

  const goTo = useCallback(
    (nextPly: number) => {
      const bounded = Math.max(0, Math.min(moves.length, nextPly))
      setPly(bounded)
      setSelected(null)
      setPendingPromotion(null)
    },
    [moves.length],
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
        return
      }

      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          setPly((current) => Math.max(0, current - 1))
          setSelected(null)
          setPendingPromotion(null)
          break
        case 'ArrowRight':
          event.preventDefault()
          setPly((current) => Math.min(moves.length, current + 1))
          setSelected(null)
          setPendingPromotion(null)
          break
        case 'Home':
          event.preventDefault()
          setPly(0)
          setSelected(null)
          setPendingPromotion(null)
          break
        case 'End':
          event.preventDefault()
          setPly(moves.length)
          setSelected(null)
          setPendingPromotion(null)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [moves.length])

  const applyMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      const chess = new Chess(currentFen)
      let move: Move | null
      try {
        move = chess.move({ from, to, promotion })
      } catch {
        return
      }
      if (!move) return

      setSelected(null)
      setPendingPromotion(null)

      if (variationFrom === null) {
        const nextMainMove = parsed.moves[ply]
        if (nextMainMove && nextMainMove.san === move.san) {
          setPly(ply + 1)
          return
        }
        const node = createMoveNode(move)
        setVariationFrom(ply)
        setMoves([...parsed.moves.slice(0, ply), node])
        setPly(ply + 1)
        return
      }

      const node = createMoveNode(move)
      setMoves((current) => [...current.slice(0, ply), node])
      setVariationFrom((current) =>
        current === null ? ply : Math.min(current, ply),
      )
      setPly(ply + 1)
    },
    [currentFen, parsed.moves, ply, variationFrom],
  )

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (selected) {
        if (square === selected) {
          setSelected(null)
          return
        }

        const candidates = position
          .moves({ square: selected, verbose: true })
          .filter((move) => move.to === square)

        if (candidates.length > 0) {
          if (candidates.some((move) => move.promotion)) {
            setPendingPromotion({ from: selected, to: square })
            return
          }
          applyMove(selected, square)
          return
        }
      }

      const piece = position.get(square)
      if (piece && piece.color === position.turn()) {
        setSelected(square)
        return
      }
      setSelected(null)
    },
    [applyMove, position, selected],
  )

  const handlePromotion = useCallback(
    (piece: PieceSymbol) => {
      if (!pendingPromotion) return
      applyMove(pendingPromotion.from, pendingPromotion.to, piece)
    },
    [applyMove, pendingPromotion],
  )

  const resetVariation = useCallback(() => {
    setMoves(parsed.moves)
    setPly(variationFrom ?? 0)
    setVariationFrom(null)
    setSelected(null)
    setPendingPromotion(null)
  }, [parsed.moves, variationFrom])

  const whiteWon = gameOutcome(game) === 'white'
  const blackWon = gameOutcome(game) === 'black'
  const topColor: PlayerColor = orientation === 'white' ? 'black' : 'white'
  const bottomColor: PlayerColor = topColor === 'white' ? 'black' : 'white'
  const topPlayer = topColor === 'white' ? game.white : game.black
  const bottomPlayer = bottomColor === 'white' ? game.white : game.black
  const isYourGame = yourColor !== null
  const termination = formatTermination(parsed.headers.Termination)
  const opening = formatOpening(game.eco)
  const customStart = Boolean(parsed.headers.FEN)
  const lastMove = ply > 0 ? moves[ply - 1] : null
  const timeClassLabel =
    TIME_CLASS_LABELS[game.time_class as keyof typeof TIME_CLASS_LABELS] ??
    game.time_class
  const score = formatScore(game)

  return (
    <div className="game-page">
      <div className="game-page__toolbar">
        <button type="button" className="button button--ghost" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          К партиям
        </button>
        <span className="game-page__crumb">
          {game.white.username} — {game.black.username}
        </span>
        <a
          className="button button--ghost game-page__external"
          href={game.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          На Chess.com
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </div>

      <header className="game-page__head">
        <div>
          <p className="game-page__eyebrow">
            {timeClassLabel} · {formatTimeControl(game)} · {score}
          </p>
          <h1 className="game-page__title">
            {game.white.username} — {game.black.username}
          </h1>
          <p className="game-page__sub">
            {formatDateTime(game.end_time)} ·{' '}
            {game.rated ? 'рейтинговая партия' : 'без рейтинга'}
            {game.rules && game.rules !== 'chess'
              ? ` · вариант: ${game.rules}`
              : ''}
          </p>
        </div>
      </header>

      <div className="game-layout">
        <section className="board-column" aria-label="Просмотр партии">
          <PlayerBar
            username={topPlayer.username}
            rating={topPlayer.rating}
            result={topPlayer.result}
            color={topColor}
            isYou={isYourGame && topColor === yourColor}
            isWinner={topColor === 'white' ? whiteWon : blackWon}
          />

          <div className="board-frame">
            <ChessBoard
              fen={currentFen}
              orientation={orientation === 'white' ? 'w' : 'b'}
              lastMove={lastMove}
              selected={selected}
              targets={legalTargets}
              onSquareClick={handleSquareClick}
            />
            {pendingPromotion ? (
              <PromotionPicker
                color={info.turn === 'w' ? 'white' : 'black'}
                onSelect={handlePromotion}
                onCancel={() => setPendingPromotion(null)}
              />
            ) : null}
          </div>

          <PlayerBar
            username={bottomPlayer.username}
            rating={bottomPlayer.rating}
            result={bottomPlayer.result}
            color={bottomColor}
            isYou={isYourGame && bottomColor === yourColor}
            isWinner={bottomColor === 'white' ? whiteWon : blackWon}
          />

          <div className="board-controls">
            <button
              type="button"
              className="icon-button"
              onClick={() => goTo(0)}
              disabled={ply === 0}
              aria-label="В начало партии"
              title="В начало (Home)"
            >
              <ChevronsLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => goTo(ply - 1)}
              disabled={ply === 0}
              aria-label="Предыдущий ход"
              title="Предыдущий ход (←)"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button icon-button--primary"
              onClick={() => goTo(ply + 1)}
              disabled={ply >= moves.length}
              aria-label="Следующий ход"
              title="Следующий ход (→)"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => goTo(moves.length)}
              disabled={ply >= moves.length}
              aria-label="В конец партии"
              title="В конец (End)"
            >
              <ChevronsRight size={20} aria-hidden="true" />
            </button>
            <span className="board-controls__spacer" />
            <button
              type="button"
              className="icon-button"
              onClick={() =>
                setOrientation((current) =>
                  current === 'white' ? 'black' : 'white',
                )
              }
              aria-label="Перевернуть доску"
              title="Перевернуть доску"
            >
              <FlipVertical2 size={19} aria-hidden="true" />
            </button>
          </div>

          <div className="board-progress">
            <input
              type="range"
              min={0}
              max={moves.length}
              value={ply}
              onChange={(event) => goTo(Number(event.target.value))}
              aria-label="Позиция в партии"
              disabled={moves.length === 0}
            />
            <span className="board-progress__value">
              {ply} / {moves.length}
            </span>
          </div>

          <div className="board-status">
            <span
              className={`status-dot status-dot--${info.turn}`}
              aria-hidden="true"
            />
            <span>{info.status}</span>
            {variationFrom !== null ? (
              <span className="badge badge--accent">вариация</span>
            ) : null}
          </div>

          {variationFrom !== null ? (
            <div className="analysis-banner">
              <span className="analysis-banner__text">
                <Sparkles size={16} aria-hidden="true" />
                Вы изучаете свой вариант — основная линия не изменена.
              </span>
              <button
                type="button"
                className="button button--small button--ghost"
                onClick={resetVariation}
              >
                Вернуться к партии
              </button>
            </div>
          ) : (
            <p className="board-hint">
              Нажмите на фигуру, чтобы попробовать другой ход.
            </p>
          )}
        </section>

        <aside className="game-sidebar">
          <section className="panel panel--moves">
            <header className="panel__head">
              <h2>Ходы</h2>
              <span className="panel__count">{formatMovesCount(moves.length)}</span>
            </header>
            {moves.length > 0 ? (
              <MoveList
                moves={moves}
                ply={ply}
                variationFrom={variationFrom}
                onSelect={goTo}
              />
            ) : (
              <p className="panel__empty">В этой партии нет ходов.</p>
            )}
            <footer className="panel__foot">
              <span className="panel__foot-move">Результат</span>
              <span className="panel__foot-value">{score}</span>
            </footer>
          </section>

          <section className="panel panel--info">
            <header className="panel__head">
              <h2>О партии</h2>
              <a
                className="panel__head-link"
                href={game.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                Открыть
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </header>
            <dl className="info-list">
              <div className="info-list__row">
                <dt>Контроль</dt>
                <dd>{formatTimeControl(game)}</dd>
              </div>
              <div className="info-list__row">
                <dt>Формат</dt>
                <dd>{timeClassLabel}</dd>
              </div>
              <div className="info-list__row">
                <dt>Дата</dt>
                <dd>{formatDateTime(game.end_time)}</dd>
              </div>
              <div className="info-list__row">
                <dt>Рейтинг</dt>
                <dd>{game.rated ? 'Да' : 'Нет'}</dd>
              </div>
              <div className="info-list__row">
                <dt>Начальная позиция</dt>
                <dd>{customStart ? 'Нестандартная' : 'Стандартная'}</dd>
              </div>
              {termination ? (
                <div className="info-list__row">
                  <dt>Окончание</dt>
                  <dd>{termination}</dd>
                </div>
              ) : null}
              {opening ? (
                <div className="info-list__row">
                  <dt>Дебют</dt>
                  <dd title={opening}>{opening}</dd>
                </div>
              ) : null}
            </dl>
            <p className="keyboard-hint">
              <Keyboard size={14} aria-hidden="true" />
              ← → — листать ходы, Home / End — начало и конец
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
