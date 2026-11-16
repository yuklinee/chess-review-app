import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import type { ChessComGame } from '../types/chesscom'
import {
  CLASSIFICATION_META,
  CLASSIFICATION_ORDER,
  formatAccuracy,
  type GameAnalysis,
} from '../lib/analysis'
import { playerColor } from '../lib/format'
import {
  ANALYSIS_DEPTH,
  ANALYSIS_MOVETIME,
} from '../lib/analysisConfig'
import type { EngineStatus } from '../hooks/useStockfishEngine'
import type {
  GameAnalysisProgress,
  GameAnalysisStatus,
} from '../hooks/useGameAnalysis'

interface AnalysisPanelProps {
  game: ChessComGame
  playerUsername: string
  engineStatus: EngineStatus
  engineError: string | null
  status: GameAnalysisStatus
  progress: GameAnalysisProgress
  analysis: GameAnalysis | null
  error: string | null
  onStart: () => void
  onCancel: () => void
}

function statusLabel(
  engineStatus: EngineStatus,
  status: GameAnalysisStatus,
): string {
  if (engineStatus === 'loading') return 'загрузка'
  if (engineStatus === 'error') return 'ошибка'
  if (status === 'running') return 'идёт'
  if (status === 'done') return 'готово'
  if (status === 'cancelled') return 'частично'
  if (status === 'error') return 'ошибка'
  return 'ожидание'
}

function statusTone(
  engineStatus: EngineStatus,
  status: GameAnalysisStatus,
): string {
  if (engineStatus === 'error' || status === 'error') return 'error'
  if (engineStatus === 'loading' || status === 'running') return 'running'
  if (status === 'done') return 'done'
  if (status === 'cancelled') return 'partial'
  return 'idle'
}

interface AccuracyCardProps {
  color: 'white' | 'black'
  username: string
  accuracy: number | null
  performance: number | null
  isYou: boolean
}

function AccuracyCard({
  color,
  username,
  accuracy,
  performance,
  isYou,
}: AccuracyCardProps) {
  return (
    <div
      className={`accuracy-card accuracy-card--${color}${
        isYou ? ' accuracy-card--you' : ''
      }`}
    >
      <div className="accuracy-card__side">
        <span className={`player-dot player-dot--${color}`} aria-hidden="true" />
        <span className="accuracy-card__side-label">
          {color === 'white' ? 'Белые' : 'Чёрные'}
        </span>
        {isYou ? <span className="you-badge">вы</span> : null}
      </div>
      <p className="accuracy-card__username">{username}</p>
      <strong className="accuracy-card__value">{formatAccuracy(accuracy)}</strong>
      <span className="accuracy-card__caption">точность</span>
      <span
        className="accuracy-card__performance"
        title="Примерный перформанс-рейтинг: рейтинг соперника + результат + поправка за точность"
      >
        перф. ≈ {performance ?? '—'}
      </span>
    </div>
  )
}

export function AnalysisPanel({
  game,
  playerUsername,
  engineStatus,
  engineError,
  status,
  progress,
  analysis,
  error,
  onStart,
  onCancel,
}: AnalysisPanelProps) {
  const percent =
    progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0
  const yourColor = playerColor(game, playerUsername)
  const label = statusLabel(engineStatus, status)
  const tone = statusTone(engineStatus, status)
  const canRestart = engineStatus === 'ready' && status !== 'running'
  const hasMoves = progress.total > 1

  return (
    <section className="panel panel--analysis" aria-label="Анализ Stockfish">
      <header className="panel__head">
        <h2>Анализ</h2>
        <span className={`analysis-badge analysis-badge--${tone}`}>
          {label}
        </span>
      </header>

      <div className="analysis-body">
        {engineStatus === 'loading' ? (
          <p className="analysis-loading">
            <LoaderCircle className="spin" size={15} aria-hidden="true" />
            Загружаем однопоточный Stockfish WASM…
          </p>
        ) : null}

        {engineStatus === 'error' ? (
          <div className="analysis-message analysis-message--error">
            <CircleAlert size={16} aria-hidden="true" />
            <p>
              {engineError ??
                'Stockfish не загрузился. Проверьте файлы в public/engine и BASE_URL.'}
            </p>
          </div>
        ) : null}

        {!hasMoves && engineStatus !== 'error' ? (
          <p className="analysis-note">В этой партии нет ходов для анализа.</p>
        ) : null}

        {engineStatus === 'ready' && hasMoves && status === 'running' ? (
          <div className="analysis-progress">
            <div className="analysis-progress__head">
              <span>Анализируем позиции…</span>
              <span>
                {progress.done} / {progress.total}
              </span>
            </div>
            <div
              className="analysis-progress__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label="Прогресс анализа"
            >
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="analysis-progress__foot">
              <span>
                до {(ANALYSIS_MOVETIME / 1000).toFixed(1).replace('.', ',')} с
                на позицию
              </span>
              <button
                type="button"
                className="button button--small button--ghost"
                onClick={onCancel}
              >
                Остановить
              </button>
            </div>
          </div>
        ) : null}

        {engineStatus === 'ready' && hasMoves && status === 'idle' ? (
          <p className="analysis-loading">
            <LoaderCircle className="spin" size={15} aria-hidden="true" />
            Готовим анализ партии…
          </p>
        ) : null}

        {status === 'error' ? (
          <div className="analysis-message analysis-message--error">
            <CircleAlert size={16} aria-hidden="true" />
            <p>{error ?? 'Не удалось завершить анализ.'}</p>
          </div>
        ) : null}

        {analysis ? (
          <>
            <div className="accuracy-grid">
              <AccuracyCard
                color="white"
                username={game.white.username}
                accuracy={analysis.accuracy.white}
                performance={analysis.performance.white}
                isYou={yourColor === 'white'}
              />
              <AccuracyCard
                color="black"
                username={game.black.username}
                accuracy={analysis.accuracy.black}
                performance={analysis.performance.black}
                isYou={yourColor === 'black'}
              />
            </div>

            <div className="classification-legend" aria-label="Обозначения ходов">
              {CLASSIFICATION_ORDER.map((classification) => (
                <span
                  className="classification-legend__item"
                  key={classification}
                  title={CLASSIFICATION_META[classification].title}
                >
                  <span
                    className={`move-badge move-badge--${classification}`}
                    aria-hidden="true"
                  >
                    {CLASSIFICATION_META[classification].symbol}
                  </span>
                  {CLASSIFICATION_META[classification].label}
                </span>
              ))}
            </div>

            {status === 'cancelled' ? (
              <p className="analysis-note analysis-note--warning">
                Анализ остановлен: оценки показаны только для обработанных
                позиций.
              </p>
            ) : (
              <p className="analysis-note">
                Точность — средняя по ходам основной линии (модель Lichess).
                Performance — оценка по точности и результату партии.
              </p>
            )}

            <div className="analysis-actions">
              <button
                type="button"
                className="button button--small button--ghost"
                onClick={onStart}
                disabled={!canRestart}
              >
                <RefreshCw size={14} aria-hidden="true" />
                {status === 'cancelled' ? 'Анализировать заново' : 'Обновить анализ'}
              </button>
              <span className="analysis-depth">
                Stockfish 19 · до d{ANALYSIS_DEPTH}
              </span>
            </div>
          </>
        ) : null}

        {status === 'error' && engineStatus === 'ready' ? (
          <div className="analysis-actions">
            <button
              type="button"
              className="button button--small button--ghost"
              onClick={onStart}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Повторить анализ
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
