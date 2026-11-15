import { useMemo } from 'react'
import { ArrowLeft, CircleAlert, ExternalLink } from 'lucide-react'
import type { ChessComGame } from '../types/chesscom'
import { parseGamePgn } from '../lib/pgn'
import { GameReview } from '../components/GameReview'

interface GameScreenProps {
  game: ChessComGame
  playerUsername: string
  onBack: () => void
}

export function GameScreen({ game, playerUsername, onBack }: GameScreenProps) {
  const parsed = useMemo(() => {
    try {
      return { data: parseGamePgn(game.pgn), error: null }
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error ? error.message : 'Неизвестная ошибка парсинга',
      }
    }
  }, [game.pgn])

  if (!parsed.data) {
    return (
      <div className="game-page">
        <div className="game-page__toolbar">
          <button type="button" className="button button--ghost" onClick={onBack}>
            <ArrowLeft size={18} aria-hidden="true" />
            К партиям
          </button>
        </div>
        <div className="message-card message-card--error" role="alert">
          <span className="message-card__icon" aria-hidden="true">
            <CircleAlert size={22} />
          </span>
          <div className="message-card__body">
            <h1>Не удалось разобрать PGN</h1>
            <p>
              Chess.js не смог прочитать ходы этой партии. Возможно, она
              сыграна в нестандартном варианте шахмат или PGN повреждён.
            </p>
            <p className="message-card__detail">{parsed.error}</p>
            <a
              className="button button--ghost button--small"
              href={game.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              Посмотреть партию на Chess.com
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <GameReview
      game={game}
      playerUsername={playerUsername}
      onBack={onBack}
      parsed={parsed.data}
    />
  )
}
