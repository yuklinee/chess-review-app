import { useCallback, useState } from 'react'
import './App.css'
import { GameScreen } from './pages/GameScreen'
import { HomePage } from './pages/HomePage'
import { usePlayerSearch } from './hooks/usePlayerSearch'
import { readRecentPlayers, rememberRecentPlayer } from './lib/storage'
import { normalizeUsername, validateUsername } from './lib/chesscom'
import type { ChessComGame } from './types/chesscom'

interface OpenGame {
  game: ChessComGame
  playerUsername: string
}

function App() {
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<string[]>(() => readRecentPlayers())
  const [openGame, setOpenGame] = useState<OpenGame | null>(null)
  const { status, result, error, search } = usePlayerSearch()

  const handleSubmit = useCallback(() => {
    const username = normalizeUsername(query)
    if (!validateUsername(username)) {
      setRecent((previous) => rememberRecentPlayer(username, previous))
    }
    void search(query)
  }, [query, search])

  const handleRecentSelect = useCallback(
    (username: string) => {
      setQuery(username)
      setRecent((previous) => rememberRecentPlayer(username, previous))
      void search(username)
    },
    [search],
  )

  const handleOpenGame = useCallback(
    (game: ChessComGame) => {
      setOpenGame({
        game,
        playerUsername: result?.username ?? '',
      })
      window.scrollTo({ top: 0, behavior: 'auto' })
    },
    [result],
  )

  const handleBack = useCallback(() => {
    setOpenGame(null)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const handleHome = useCallback(() => {
    if (openGame) {
      handleBack()
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [handleBack, openGame])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Перейти к содержимому
      </a>

      <header className="site-header">
        <div className="site-header__inner">
          <button
            type="button"
            className="brand"
            onClick={handleHome}
            aria-label="Chess Review — на главную"
          >
            <span className="brand__mark" aria-hidden="true">
              ♞
            </span>
            <span className="brand__text">
              Chess<span className="brand__accent">Review</span>
            </span>
          </button>

          <div className="header-note">
            <span className="status-dot status-dot--online" aria-hidden="true" />
            Публичный API Chess.com
          </div>
        </div>
      </header>

      <main className="site-main" id="main">
        {openGame ? (
          <GameScreen
            key={openGame.game.uuid ?? openGame.game.url}
            game={openGame.game}
            playerUsername={openGame.playerUsername}
            onBack={handleBack}
          />
        ) : (
          <HomePage
            query={query}
            onQueryChange={setQuery}
            onSubmit={handleSubmit}
            onRecentSelect={handleRecentSelect}
            status={status}
            result={result}
            error={error}
            recent={recent}
            onOpenGame={handleOpenGame}
          />
        )}
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <p>
            Данные —{' '}
            <a
              href="https://www.chess.com/news/view/published-data-api"
              target="_blank"
              rel="noreferrer noopener"
            >
              публичный API Chess.com
            </a>
            . Приложение не аффилировано с Chess.com.
          </p>
          <p className="site-footer__tech">React · Vite · TypeScript · chess.js</p>
        </div>
      </footer>
    </div>
  )
}

export default App
