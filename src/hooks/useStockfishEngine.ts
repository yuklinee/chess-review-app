import { useEffect, useState } from 'react'
import { StockfishEngine } from '../lib/stockfish'

export type EngineStatus = 'loading' | 'ready' | 'error'

export interface UseStockfishEngineResult {
  engine: StockfishEngine | null
  status: EngineStatus
  error: string | null
}

/**
 * Creates a Stockfish Web Worker for the lifetime of the game screen.
 * The worker keeps the WASM search off the main thread.
 */
export function useStockfishEngine(): UseStockfishEngineResult {
  const [engine, setEngine] = useState<StockfishEngine | null>(null)
  const [status, setStatus] = useState<EngineStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let failed = false
    const instance = new StockfishEngine()

    instance.init().then(
      () => {
        if (active) setStatus('ready')
      },
      (reason: unknown) => {
        if (!active) return
        failed = true
        setError(
          reason instanceof Error
            ? reason.message
            : 'Не удалось загрузить Stockfish.',
        )
        setStatus('error')
      },
    )

    // Publish the instance after effects finish: the analysis hook can then
    // subscribe to it without reading a mutable ref during render.
    queueMicrotask(() => {
      if (active && !failed) setEngine(instance)
    })

    return () => {
      active = false
      instance.destroy()
    }
  }, [])

  return { engine, status, error }
}
