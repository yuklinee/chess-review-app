import type {
  ChessComGame,
  GameOutcome,
  PlayerColor,
  PlayerOutcome,
  TimeClass,
} from '../types/chesscom'

export const TIME_CLASS_LABELS: Record<TimeClass, string> = {
  bullet: 'Пуля',
  blitz: 'Блиц',
  rapid: 'Рапид',
  daily: 'По дням',
}

const RESULT_LABELS: Record<string, string> = {
  win: 'Победа',
  checkmated: 'Мат',
  resigned: 'Сдался',
  timeout: 'Время',
  agreed: 'Ничья',
  repetition: 'Повторение',
  stalemate: 'Пат',
  insufficient: 'Мало материала',
  '50move': '50 ходов',
  abandoned: 'Брошена',
  timevsinsufficient: 'Время',
  kingofthehill: 'Царь горы',
  threecheck: 'Три шаха',
  bughousepartnerlose: 'Партнёр',
}

const DRAW_RESULTS = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'timevsinsufficient',
  'draw',
])

export function pluralRu(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

function formatNumber(minutes: number): string {
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1)
}

/** "600" -> "10 мин", "180+2" -> "3+2", "1/86400" -> "1 день/ход". */
export function formatTimeControl(
  game: Pick<ChessComGame, 'time_control' | 'time_class'>,
): string {
  const raw = (game.time_control ?? '').trim()
  if (!raw) return '—'

  if (game.time_class === 'daily') {
    const daily = /^(\d+)\/(\d+)$/.exec(raw)
    if (daily) {
      const secondsPerMove = Number(daily[2]) / Math.max(1, Number(daily[1]))
      const days = Math.round(secondsPerMove / 86_400)
      if (days >= 1) {
        return `${days} ${pluralRu(days, 'день', 'дня', 'дней')}/ход`
      }
    }
    return 'По дням'
  }

  const [baseRaw, incrementRaw] = raw.split('+')
  const base = Number(baseRaw)
  if (!Number.isFinite(base) || base <= 0) return raw

  const increment = Number(incrementRaw)
  const hasIncrement = Number.isFinite(increment) && increment > 0

  if (base < 60) {
    return hasIncrement ? `${base}+${increment} сек` : `${base} сек`
  }

  const minutes = formatNumber(base / 60)
  return hasIncrement ? `${minutes}+${increment}` : `${minutes} мин`
}

export function gameOutcome(game: ChessComGame): GameOutcome {
  if (game.white.result === 'win') return 'white'
  if (game.black.result === 'win') return 'black'
  return 'draw'
}

export function formatScore(game: ChessComGame): string {
  const outcome = gameOutcome(game)
  if (outcome === 'white') return '1–0'
  if (outcome === 'black') return '0–1'
  return '½–½'
}

export function playerColor(
  game: ChessComGame,
  username: string,
): PlayerColor | null {
  const target = username.trim().toLowerCase()
  if (!target) return null
  if (game.white.username.toLowerCase() === target) return 'white'
  if (game.black.username.toLowerCase() === target) return 'black'
  return null
}

export function outcomeForPlayer(
  game: ChessComGame,
  username: string,
): PlayerOutcome | null {
  const color = playerColor(game, username)
  if (!color) return null
  const outcome = gameOutcome(game)
  if (outcome === 'draw') return 'draw'
  return outcome === color ? 'win' : 'loss'
}

export function formatResultCode(code: string | undefined): string {
  if (!code) return '—'
  return RESULT_LABELS[code] ?? code
}

export function isDrawResult(code: string | undefined): boolean {
  return code ? DRAW_RESULTS.has(code) : false
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const monthYearFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const countFormatter = new Intl.NumberFormat('ru-RU')

export function formatDate(unixSeconds?: number): string {
  if (!unixSeconds) return '—'
  return dateFormatter.format(new Date(unixSeconds * 1000)).replace(' г.', '')
}

export function formatDateTime(unixSeconds?: number): string {
  if (!unixSeconds) return '—'
  return dateTimeFormatter
    .format(new Date(unixSeconds * 1000))
    .replace(' г.', '')
}

export function formatJoined(unixSeconds?: number): string {
  if (!unixSeconds) return '—'
  return monthYearFormatter.format(new Date(unixSeconds * 1000)).replace(' г.', '')
}

export function formatCount(value?: number): string {
  return typeof value === 'number' ? countFormatter.format(value) : '—'
}

/** "https://api.chess.com/pub/player/hikaru/games/2026/11" -> "ноябрь 2026" */
export function formatArchiveLabel(url: string | null): string {
  if (!url) return ''
  const match = /\/games\/(\d{4})\/(\d{2})\/?$/.exec(url)
  if (!match) return 'последний архив'
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1))
  return monthYearFormatter.format(date).replace(' г.', '')
}

/** Human readable opening name from Chess.com ECO URL. */
export function formatOpening(ecoUrl?: string): string | null {
  if (!ecoUrl) return null
  const segment = ecoUrl.split('/').filter(Boolean).pop()
  if (!segment) return null
  let decoded = segment
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    // Keep the raw segment when it is not valid percent-encoding.
  }
  const pretty = decoded
    .replace(/O-O-O/g, '__CASTLE_LONG__')
    .replace(/O-O/g, '__CASTLE_SHORT__')
    .replace(/-/g, ' ')
    .replace(/__CASTLE_LONG__/g, 'O-O-O')
    .replace(/__CASTLE_SHORT__/g, 'O-O')
    .replace(/\s+/g, ' ')
    .trim()
  return pretty || null
}

const WIN_REASONS: Record<string, string> = {
  resignation: 'соперник сдался',
  checkmate: 'мат',
  time: 'по времени',
  abandonment: 'соперник покинул партию',
  agreement: 'по согласию',
  repetition: 'из-за повторения позиции',
  stalemate: 'пат',
  insufficient: 'из-за нехватки материала',
  '50move': 'по правилу 50 ходов',
}

const DRAW_REASONS: Record<string, string> = {
  agreement: 'по согласию',
  repetition: 'из-за повторения позиции',
  stalemate: 'пат',
  insufficient: 'из-за нехватки материала',
  '50move': 'по правилу 50 ходов',
  time: 'по времени',
}

/** Translates the English PGN "Termination" header. */
export function formatTermination(termination?: string): string | null {
  if (!termination) return null
  const value = termination.trim()

  const onTime = /^(.+?) won on time$/i.exec(value)
  if (onTime) return `${onTime[1]} — победа по времени`

  const winBy = /^(.+?) won by (.+)$/i.exec(value)
  if (winBy) {
    const reason = winBy[2].trim()
    const key = reason.toLowerCase().replace(/\s+/g, ' ')
    const reasonText = WIN_REASONS[key] ?? reason
    return `${winBy[1]} — победа: ${reasonText}`
  }

  const drawnBy = /^game drawn by (.+)$/i.exec(value)
  if (drawnBy) {
    const reason = drawnBy[1].trim()
    const key = reason.toLowerCase().replace(/\s+/g, ' ')
    const reasonText = DRAW_REASONS[key] ?? reason
    return `Ничья ${reasonText}`
  }

  if (/^game drawn$/i.test(value)) return 'Ничья'
  return value
}

export function formatMovesCount(plies: number): string {
  const moves = Math.ceil(plies / 2)
  return `${moves} ${pluralRu(moves, 'ход', 'хода', 'ходов')}`
}
