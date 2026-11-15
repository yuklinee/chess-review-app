import { Search, LoaderCircle } from 'lucide-react'

interface SearchFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  loading?: boolean
  autoFocus?: boolean
}

export function SearchForm({
  value,
  onChange,
  onSubmit,
  loading = false,
  autoFocus = false,
}: SearchFormProps) {
  return (
    <form
      className="search-form"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <label className="sr-only" htmlFor="player-search">
        Никнейм игрока Chess.com
      </label>
      <div className="search-form__field">
        <Search className="search-form__icon" size={20} aria-hidden="true" />
        <input
          id="player-search"
          className="search-form__input"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Например, Hikaru"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={40}
          autoFocus={autoFocus}
          aria-describedby="player-search-hint"
        />
        <button
          type="submit"
          className="button button--primary search-form__submit"
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle className="spin" size={18} aria-hidden="true" />
          ) : (
            <Search size={18} aria-hidden="true" />
          )}
          <span>{loading ? 'Ищем…' : 'Найти партии'}</span>
        </button>
      </div>
      <p className="search-form__hint" id="player-search-hint">
        Публичный API Chess.com · последний архив · 10 партий
      </p>
    </form>
  )
}
