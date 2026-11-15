import { useEffect, useRef } from 'react'
import {
  ChessKnight,
  CircleAlert,
  Keyboard,
  ListOrdered,
  RefreshCw,
  Swords,
} from 'lucide-react'
import type { ChessComGame, PlayerSearchResult } from '../types/chesscom'
import type { SearchStatus } from '../hooks/usePlayerSearch'
import {
  formatArchiveLabel,
  pluralRu,
} from '../lib/format'
import { SearchForm } from '../components/SearchForm'
import { PlayerProfileCard } from '../components/PlayerProfileCard'
import { GameCard } from '../components/GameCard'

interface HomePageProps {
  query: string
  onQueryChange: (value: string) => void
  onSubmit: () => void
  onRecentSelect: (username: string) => void
  status: SearchStatus
  result: PlayerSearchResult | null
  error: string | null
  recent: string[]
  onOpenGame: (game: ChessComGame) => void
}

const FEATURES = [
  {
    icon: ListOrdered,
    title: '10 последних партий',
    text: 'Актуальный архив игрока: соперники, рейтинги, контроль времени и ссылка на оригинал.',
  },
  {
    icon: ChessKnight,
    title: 'Интерактивная доска',
    text: 'Позиции, нотация и легальные ходы — всё считается библиотекой chess.js.',
  },
  {
    icon: Keyboard,
    title: 'Разбор ход за ходом',
    text: 'Кнопки, клавиши со стрелками или ползунок — листайте партию в удобном темпе.',
  },
]

function LoadingState() {
  return (
    <div className="results results--loading" aria-busy="true" aria-live="polite">
      <div className="skeleton skeleton--profile" />
      <div className="games-column">
        <div className="skeleton skeleton--heading" />
        {[0, 1, 2, 3].map((item) => (
          <div className="skeleton skeleton--card" key={item} />
        ))}
        <span className="sr-only">Загружаем партии с Chess.com…</span>
      </div>
    </div>
  )
}

interface ErrorStateProps {
  message: string | null
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="message-card message-card--error" role="alert">
      <span className="message-card__icon" aria-hidden="true">
        <CircleAlert size={22} />
      </span>
      <div className="message-card__body">
        <h2>Не получилось загрузить партии</h2>
        <p>{message ?? 'Проверьте никнейм и попробуйте ещё раз.'}</p>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={onRetry}
        >
          <RefreshCw size={15} aria-hidden="true" />
          Попробовать снова
        </button>
      </div>
    </div>
  )
}

function Features() {
  return (
    <section className="features" aria-label="Возможности приложения">
      {FEATURES.map(({ icon: Icon, title, text }) => (
        <article className="feature" key={title}>
          <span className="feature__icon" aria-hidden="true">
            <Icon size={20} />
          </span>
          <h2>{title}</h2>
          <p>{text}</p>
        </article>
      ))}
    </section>
  )
}

function EmptyGames({ result }: { result: PlayerSearchResult }) {
  const archive = formatArchiveLabel(result.archiveUrl)
  return (
    <div className="message-card message-card--empty">
      <span className="message-card__icon" aria-hidden="true">
        <ChessKnight size={22} />
      </span>
      <div className="message-card__body">
        <h2>Партий пока нет</h2>
        <p>
          {result.archiveUrl
            ? `В архиве за ${archive} нет завершённых партий. Попробуйте открыть другого игрока или загляните позже.`
            : 'У этого игрока ещё нет архива партий на Chess.com. Сыграйте партию — и она появится здесь.'}
        </p>
      </div>
    </div>
  )
}

export function HomePage({
  query,
  onQueryChange,
  onSubmit,
  onRecentSelect,
  status,
  result,
  error,
  recent,
  onOpenGame,
}: HomePageProps) {
  const resultsRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (status !== 'success' || !result) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    resultsRef.current?.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [status, result])

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__inner">
          <p className="eyebrow">
            <Swords size={15} aria-hidden="true" />
            Разбор партий Chess.com
          </p>
          <h1 className="hero__title">
            Ваши партии —<br />
            <span className="hero__title-accent">под микроскопом</span>
          </h1>
          <p className="hero__lead">
            Введите никнейм на Chess.com: загрузим последние партии из
            актуального архива и откроем интерактивную доску для разбора.
          </p>

          <SearchForm
            value={query}
            onChange={onQueryChange}
            onSubmit={onSubmit}
            loading={status === 'loading'}
            autoFocus
          />

          {recent.length > 0 ? (
            <div className="recent">
              <span className="recent__label">Недавние:</span>
              <div className="recent__list">
                {recent.map((username) => (
                  <button
                    type="button"
                    className="recent__chip"
                    key={username}
                    onClick={() => onRecentSelect(username)}
                    disabled={status === 'loading'}
                  >
                    {username}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <div className="page-content">
        {status === 'loading' ? <LoadingState /> : null}
        {status === 'error' ? (
          <ErrorState message={error} onRetry={onSubmit} />
        ) : null}

        {status === 'success' && result ? (
          <section
            className="results"
            aria-labelledby="results-heading"
            ref={resultsRef}
          >
            <PlayerProfileCard
              key={result.username}
              username={result.username}
              profile={result.profile}
              stats={result.stats}
            />

            <div className="games-column">
              <div className="section-head">
                <div>
                  <h2 id="results-heading">Последние партии</h2>
                  <p className="section-head__sub">
                    {result.archiveUrl
                      ? `Архив: ${formatArchiveLabel(result.archiveUrl)}`
                      : 'Архив не найден'}
                    {result.games.length > 0
                      ? ` · ${result.games.length} ${pluralRu(
                          result.games.length,
                          'партия',
                          'партии',
                          'партий',
                        )}`
                      : ''}
                    {result.usedFallback
                      ? ' · в последнем архиве пока пусто'
                      : ''}
                  </p>
                </div>
                <span className="count-badge">{result.games.length} / 10</span>
              </div>

              {result.games.length > 0 ? (
                <ul className="game-list">
                  {result.games.map((game) => (
                    <li key={game.uuid ?? game.url}>
                      <GameCard
                        game={game}
                        playerUsername={result.username}
                        onOpen={onOpenGame}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyGames result={result} />
              )}
            </div>
          </section>
        ) : null}

        {status === 'idle' ? <Features /> : null}
      </div>
    </div>
  )
}
