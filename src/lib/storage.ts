const RECENT_KEY = 'chess-review:recent-players'
const RECENT_LIMIT = 5

export function readRecentPlayers(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

export function rememberRecentPlayer(
  username: string,
  current: string[],
): string[] {
  const next = [
    username,
    ...current.filter(
      (item) => item.toLowerCase() !== username.toLowerCase(),
    ),
  ].slice(0, RECENT_LIMIT)

  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // Private mode or a full storage quota: recent searches are optional.
  }

  return next
}
