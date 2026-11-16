import { LoaderCircle, Sparkles } from 'lucide-react'
import type { PositionEvaluation } from '../lib/analysis'
import { formatEvaluation, whiteWinPercent } from '../lib/analysis'
import type { EngineStatus } from '../hooks/useStockfishEngine'

interface EngineBarProps {
  evaluation: PositionEvaluation | null
  engineStatus: EngineStatus
  loading: boolean
  bestMoveSan: string | null
  playedSan: string | null
  hasPreviousMove: boolean
  bestMoveDepth: number | null
  error: string | null
  onShowBestMove: () => void
  onHideBestMove: () => void
}

export function EngineBar({
  evaluation,
  engineStatus,
  loading,
  bestMoveSan,
  playedSan,
  hasPreviousMove,
  bestMoveDepth,
  error,
  onShowBestMove,
  onHideBestMove,
}: EngineBarProps) {
  const formatted = formatEvaluation(evaluation)
  const whitePercent = evaluation ? whiteWinPercent(evaluation) : 50
  const disabled = engineStatus !== 'ready' || loading

  let buttonLabel = 'Показать лучший ход'
  if (engineStatus === 'loading') buttonLabel = 'Движок загружается…'
  else if (engineStatus === 'error') buttonLabel = 'Движок недоступен'
  else if (loading) buttonLabel = 'Ищу лучший ход…'

  return (
    <div className="engine-area">
      <div className="engine-bar">
        <div className="engine-eval">
          <span className="engine-eval__label">Оценка</span>
          <strong
            className={`engine-eval__value engine-eval__value--${formatted.tone}`}
            title={formatted.detail}
          >
            {formatted.text}
          </strong>
          {evaluation && evaluation.depth > 0 ? (
            <span className="engine-eval__depth">d{evaluation.depth}</span>
          ) : null}
        </div>

        <div
          className="eval-bar"
          role="img"
          aria-label={`Оценка позиции: ${formatted.text}. ${formatted.detail}`}
        >
          <span
            className="eval-bar__white"
            style={{ width: `${whitePercent}%` }}
          />
          <span className="eval-bar__center" aria-hidden="true" />
        </div>

        <button
          type="button"
          className="button button--primary button--small engine-bar__button"
          onClick={onShowBestMove}
          disabled={disabled}
          title={
            engineStatus === 'loading'
              ? 'Однопоточный Stockfish ещё загружается'
              : hasPreviousMove
                ? 'Отмотать на ход назад и показать, что стоило сыграть вместо последнего хода'
                : 'Запросить у Stockfish лучший ход для текущей позиции'
          }
        >
          {loading ? (
            <LoaderCircle className="spin" size={15} aria-hidden="true" />
          ) : (
            <Sparkles size={15} aria-hidden="true" />
          )}
          {buttonLabel}
        </button>
      </div>

      {bestMoveSan ? (
        <div className="best-move-line">
          <span>
            {playedSan ? (
              bestMoveSan === playedSan ? (
                <>
                  <span className="best-move-line__label">
                    Лучший ход — как сыграно:
                  </span>{' '}
                  <strong>{bestMoveSan}</strong>
                </>
              ) : (
                <>
                  <span className="best-move-line__label">
                    Лучший ход вместо
                  </span>{' '}
                  <strong className="best-move-line__played">{playedSan}</strong>
                  <span className="best-move-line__label">:</span>{' '}
                  <strong>{bestMoveSan}</strong>
                </>
              )
            ) : (
              <>
                <span className="best-move-line__label">Лучший ход:</span>{' '}
                <strong>{bestMoveSan}</strong>
              </>
            )}
            {bestMoveDepth ? (
              <span className="best-move-line__depth">
                {' '}
                · d{bestMoveDepth}
              </span>
            ) : null}
          </span>
          <button
            type="button"
            className="link-button"
            onClick={onHideBestMove}
          >
            Скрыть стрелку
          </button>
        </div>
      ) : null}

      {hasPreviousMove &&
      engineStatus === 'ready' &&
      !bestMoveSan &&
      !loading &&
      !error ? (
        <p className="engine-bar__hint">
          Кнопка отмотает позицию на ход назад и покажет, что стоило сыграть
          вместо последнего хода.
        </p>
      ) : null}

      {error ? <p className="engine-bar__error">{error}</p> : null}
    </div>
  )
}
