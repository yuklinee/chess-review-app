import {
  ChevronRight,
  Clock,
  ExternalLink,
  Trophy,
} from 'lucide-react'
import type { ChessComGame, PlayerColor } from '../types/chesscom'
import {
  TIME_CLASS_LABELS,
  formatDate,
  formatOpening,
  formatResultCode,
  formatScore,
  formatTimeControl,
  gameOutcome,
  isDrawResult,
  outcomeForPlayer,
  playerColor,
} from '../lib/format'

interface GameCardProps {
  game: ChessComGame
  playerUsername: string
  onOpen: (game: ChessComGame) => void
}

type ResultTone = 'win' | 'loss' | 'draw'

function resultTone(result: string): ResultTone {
  if (result === 'win') return 'win'
  if (isDrawResult(result)) return 'draw'
  return 'loss'
}

interface PlayerLineProps {
  color: PlayerColor
  username: string
  rating?: number
  result: string
  isYou: boolean
  isWinner: boolean
}

function PlayerLine({
  color,
  username,
  rating,
  result,
  isYou,
  isWinner,
}: PlayerLineProps) {
  return (
    <span className={`player-line${isWinner ? ' player-line--winner' : ''}`}>
      <span
        className={`player-dot player-dot--${color}`}
        aria-hidden="true"
      />
      <span className="player-line__name">
        {username}
        {isYou ? <span className="you-badge">вы</span> : null}
      </span>
      <span className="player-line__meta">
        <span className="player-line__rating">
          {typeof rating === 'number' ? rating : '—'}
        </span>
        <span
          className={`player-line__result player-line__result--${resultTone(result)}`}
        >
          {formatResultCode(result)}
        </span>
        {isWinner ? (
          <Trophy
            className="player-line__trophy"
            size={14}
            aria-label="Победитель"
          />
        ) : null}
      </span>
    </span>
  )
}

export function GameCard({ game, playerUsername, onOpen }: GameCardProps) {
  const youColor = playerColor(game, playerUsername)
  const outcome = outcomeForPlayer(game, playerUsername)
  const verdict = gameOutcome(game)
  const whiteWon = verdict === 'white'
  const blackWon = verdict === 'black'
  const opening = formatOpening(game.eco)
  const timeClassLabel =
    TIME_CLASS_LABELS[game.time_class as keyof typeof TIME_CLASS_LABELS] ??
    game.time_class
  const accuracy =
    typeof game.accuracies?.white === 'number' &&
    typeof game.accuracies?.black === 'number'
      ? `${game.accuracies.white.toFixed(1).replace('.', ',')} / ${game.accuracies.black
          .toFixed(1)
          .replace('.', ',')}`
      : null

  return (
    <article className="game-card">
      <button
        type="button"
        className="game-card__button"
        onClick={() => onOpen(game)}
        aria-label={`Открыть разбор партии ${game.white.username} против ${game.black.username}`}
      >
        <span className="game-card__head">
          <span
            className={`result-badge result-badge--${outcome ?? 'neutral'}`}
            title={`Результат: ${formatScore(game)}`}
          >
            {formatScore(game)}
          </span>
          <span className={`time-chip time-chip--${game.time_class}`}>
            {timeClassLabel}
          </span>
          <span className="game-card__time">
            <Clock size={14} aria-hidden="true" />
            {formatTimeControl(game)}
          </span>
          <span className="game-card__date">{formatDate(game.end_time)}</span>
          <ChevronRight
            className="game-card__chevron"
            size={18}
            aria-hidden="true"
          />
        </span>

        <span className="game-card__players">
          <PlayerLine
            color="white"
            username={game.white.username}
            rating={game.white.rating}
            result={game.white.result}
            isYou={youColor === 'white'}
            isWinner={whiteWon}
          />
          <PlayerLine
            color="black"
            username={game.black.username}
            rating={game.black.rating}
            result={game.black.result}
            isYou={youColor === 'black'}
            isWinner={blackWon}
          />
        </span>
      </button>

      <div className="game-card__footer">
        {opening ? (
          <span className="game-card__opening" title={opening}>
            {opening}
          </span>
        ) : (
          <span className="game-card__opening game-card__opening--empty">
            Без названия дебюта
          </span>
        )}
        <span className="game-card__footer-right">
          {accuracy ? (
            <span className="game-card__accuracy" title="Точность: белые / чёрные">
              {accuracy}
            </span>
          ) : null}
          <a
            className="game-card__link"
            href={game.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Открыть партию на Chess.com в новой вкладке`}
          >
            Chess.com
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </span>
      </div>
    </article>
  )
}
