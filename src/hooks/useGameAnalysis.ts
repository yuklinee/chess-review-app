import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChessComGame } from '../types/chesscom'
import type { MoveNode } from '../lib/pgn'
import type { StockfishEngine } from '../lib/stockfish'
import {
  buildGameAnalysis,
  normalizeEvaluation,
  type GameAnalysis,
  type PositionEvaluation,
} from '../lib/analysis'
import {
  ANALYSIS_DEPTH,
  ANALYSIS_MOVETIME,
} from '../lib/analysisConfig'
import type { EngineStatus } from './useStockfishEngine'

export type GameAnalysisStatus =
  | 'idle'
  | 'running'
  | 'done'
  | 'cancelled'
  | 'error'

export interface GameAnalysisProgress {
  done: number
  total: number
}

export interface UseGameAnalysisOptions {
  engine: StockfishEngine | null
  engineStatus: EngineStatus
  positions: string[]
  moves: MoveNode[]
  game: ChessComGame
}

export interface UseGameAnalysisResult {
  status: GameAnalysisStatus
  progress: GameAnalysisProgress
  evaluations: (PositionEvaluation | null)[]
  analysis: GameAnalysis | null
  error: string | null
  start: () => void
  cancel: () => void
}

/**
 * Runs a full-game pass over the main line: every position is searched once,
 * then the evaluation deltas are converted into move grades and accuracy.
 */
export function useGameAnalysis({
  engine,
  engineStatus,
  positions,
  moves,
  game,
}: UseGameAnalysisOptions): UseGameAnalysisResult {
  const [status, setStatus] = useState<GameAnalysisStatus>('idle')
  const [progress, setProgress] = useState<GameAnalysisProgress>({
    done: 0,
    total: positions.length,
  })
  const [evaluations, setEvaluations] = useState<
    (PositionEvaluation | null)[]
  >(() => positions.map(() => null))
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const controllerRef = useRef<AbortController | null>(null)
  const runIdRef = useRef(0)
  const autoStartedRef = useRef(false)

  const start = useCallback(() => {
    if (!engine || engineStatus !== 'ready' || positions.length === 0) return

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    runIdRef.current += 1
    const runId = runIdRef.current
    const total = positions.length
    const nextEvaluations: (PositionEvaluation | null)[] = positions.map(
      () => null,
    )

    void (async () => {
      // Deferring the first state update keeps the auto-start effect free of
      // synchronous cascading renders.
      await Promise.resolve()
      if (controller.signal.aborted || runIdRef.current !== runId) return

      setStatus('running')
      setError(null)
      setAnalysis(null)
      setEvaluations(nextEvaluations)
      setProgress({ done: 0, total })

      try {
        for (let index = 0; index < positions.length; index += 1) {
          if (controller.signal.aborted || runIdRef.current !== runId) break

          const fen = positions[index]
          const result = await engine.search({
            fen,
            depth: ANALYSIS_DEPTH,
            movetime: ANALYSIS_MOVETIME,
            signal: controller.signal,
          })

          if (controller.signal.aborted || runIdRef.current !== runId) break

          nextEvaluations[index] = normalizeEvaluation(result, fen)
          setEvaluations([...nextEvaluations])
          setProgress({ done: index + 1, total })
        }

        if (runIdRef.current !== runId) return

        const complete = nextEvaluations.every((item) => item !== null)
        setAnalysis(buildGameAnalysis(nextEvaluations, moves, game))
        setStatus(controller.signal.aborted || !complete ? 'cancelled' : 'done')
      } catch (reason) {
        if (runIdRef.current !== runId) return

        if (controller.signal.aborted) {
          setAnalysis(buildGameAnalysis(nextEvaluations, moves, game))
          setStatus('cancelled')
          return
        }

        setError(
          reason instanceof Error
            ? reason.message
            : 'Stockfish не смог проанализировать партию.',
        )
        setStatus('error')
      }
    })()
  }, [engine, engineStatus, game, moves, positions])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  useEffect(() => {
    if (autoStartedRef.current) return
    if (engineStatus !== 'ready' || !engine || moves.length === 0) return
    autoStartedRef.current = true
    start()
  }, [engine, engineStatus, moves.length, start])

  useEffect(() => {
    return () => {
      runIdRef.current += 1
      controllerRef.current?.abort()
    }
  }, [])

  return {
    status,
    progress,
    evaluations,
    analysis,
    error,
    start,
    cancel,
  }
}
