import type {
  ArchivesResponse,
  ChessComGame,
  GamesResponse,
  PlayerGames,
  PlayerProfile,
  PlayerSearchResult,
  PlayerStats,
} from '../types/chesscom'

const API_ROOT = 'https://api.chess.com/pub'
const MAX_GAMES = 10
const ARCHIVES_TO_CHECK = 3

export class ChessComApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ChessComApiError'
    this.status = status
  }
}

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@+/, '').replace(/\/+$/, '')
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Введите никнейм игрока Chess.com.'
  }
  if (username.length < 2 || username.length > 40) {
    return 'Никнейм должен содержать от 2 до 40 символов.'
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return 'В никнейме допустимы только латинские буквы, цифры, дефис и подчёркивание.'
  }
  return null
}

async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ChessComApiError(
      'Не удалось связаться с Chess.com. Проверьте соединение и попробуйте ещё раз.',
      0,
    )
  }

  if (response.status === 404) {
    throw new ChessComApiError('Игрок не найден на Chess.com.', 404)
  }
  if (response.status === 429) {
    throw new ChessComApiError(
      'Chess.com ограничил частоту запросов. Подождите немного и попробуйте снова.',
      429,
    )
  }
  if (!response.ok) {
    throw new ChessComApiError(
      `Chess.com вернул ошибку ${response.status}. Попробуйте позже.`,
      response.status,
    )
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new ChessComApiError('Chess.com вернул некорректный ответ.', response.status)
  }
}

async function fetchArchiveGames(
  archiveUrl: string,
  signal?: AbortSignal,
): Promise<ChessComGame[]> {
  const data = await request<GamesResponse>(archiveUrl, signal)
  return Array.isArray(data.games) ? data.games : []
}

async function fetchPlayerGames(
  username: string,
  signal?: AbortSignal,
): Promise<PlayerGames> {
  const encoded = encodeURIComponent(username)
  const data = await request<ArchivesResponse>(
    `${API_ROOT}/player/${encoded}/games/archives`,
    signal,
  )

  const archives = (data.archives ?? []).filter(
    (url): url is string => typeof url === 'string' && url.length > 0,
  )

  if (archives.length === 0) {
    return {
      games: [],
      archiveUrl: null,
      archivesChecked: 0,
      usedFallback: false,
    }
  }

  // Chess.com may already return an archive for the current month even when
  // the player has not finished a single game in it yet. In that case fall
  // back to the previous month instead of showing an empty list.
  const candidates = archives.slice(-ARCHIVES_TO_CHECK).reverse()
  let archivesChecked = 0

  for (const archiveUrl of candidates) {
    archivesChecked += 1
    const games = await fetchArchiveGames(archiveUrl, signal)
    if (games.length > 0) {
      const sorted = [...games]
        .sort((a, b) => b.end_time - a.end_time)
        .slice(0, MAX_GAMES)
      return {
        games: sorted,
        archiveUrl,
        archivesChecked,
        usedFallback: archivesChecked > 1,
      }
    }
  }

  return {
    games: [],
    archiveUrl: candidates[0] ?? null,
    archivesChecked,
    usedFallback: archivesChecked > 1,
  }
}

export async function searchPlayer(
  rawUsername: string,
  signal?: AbortSignal,
): Promise<PlayerSearchResult> {
  const username = normalizeUsername(rawUsername)
  const validation = validateUsername(username)
  if (validation) {
    throw new ChessComApiError(validation, 0)
  }

  const encoded = encodeURIComponent(username)
  const [gamesResult, profileResult, statsResult] = await Promise.allSettled([
    fetchPlayerGames(username, signal),
    request<PlayerProfile>(`${API_ROOT}/player/${encoded}`, signal),
    request<PlayerStats>(`${API_ROOT}/player/${encoded}/stats`, signal),
  ])

  if (signal?.aborted) {
    throw new ChessComApiError('Запрос отменён.', 0)
  }

  if (gamesResult.status === 'rejected') {
    const reason: unknown = gamesResult.reason
    if (reason instanceof ChessComApiError && reason.status === 404) {
      throw new ChessComApiError(
        `Игрок «${username}» не найден на Chess.com.`,
        404,
      )
    }
    throw reason
  }

  const profile =
    profileResult.status === 'fulfilled' ? profileResult.value : null
  const stats = statsResult.status === 'fulfilled' ? statsResult.value : null

  return {
    username: profile?.username ?? username,
    profile,
    stats,
    ...gamesResult.value,
  }
}
