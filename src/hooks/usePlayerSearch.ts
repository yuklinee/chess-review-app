import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChessComApiError,
  normalizeUsername,
  searchPlayer,
  validateUsername,
} from '../lib/chesscom'
import type { PlayerSearchResult } from '../types/chesscom'

export type SearchStatus = 'idle' | 'loading' | 'success' | 'error'

export interface PlayerSearchState {
  status: SearchStatus
  query: string
  result: PlayerSearchResult | null
  error: string | null
}

const INITIAL_STATE: PlayerSearchState = {
  status: 'idle',
  query: '',
  result: null,
  error: null,
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ChessComApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Не удалось загрузить данные. Попробуйте ещё раз.'
}

export function usePlayerSearch() {
  const [state, setState] = useState<PlayerSearchState>(INITIAL_STATE)
  const controllerRef = useRef<AbortController | null>(null)

  const search = useCallback(async (rawUsername: string) => {
    const username = normalizeUsername(rawUsername)
    const validation = validateUsername(username)

    if (validation) {
      setState({
        status: 'error',
        query: username,
        result: null,
        error: validation,
      })
      return
    }

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setState({
      status: 'loading',
      query: username,
      result: null,
      error: null,
    })

    try {
      const result = await searchPlayer(username, controller.signal)
      if (controller.signal.aborted) return
      setState({
        status: 'success',
        query: result.username,
        result,
        error: null,
      })
    } catch (error) {
      if (controller.signal.aborted) return
      setState({
        status: 'error',
        query: username,
        result: null,
        error: toErrorMessage(error),
      })
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  return { ...state, search }
}
