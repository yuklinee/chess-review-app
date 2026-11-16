export interface EngineScore {
  type: 'cp' | 'mate'
  value: number
}

export interface SearchInfo {
  depth: number
  score: EngineScore | null
  pv: string[]
}

export interface SearchResult extends SearchInfo {
  bestMoveUci: string | null
}

export interface SearchOptions {
  fen: string
  depth?: number
  /** Optional hard time limit per position, in milliseconds. */
  movetime?: number
  signal?: AbortSignal
  onInfo?: (info: SearchInfo) => void
}

interface ActiveSearch {
  options: SearchOptions
  info: SearchInfo
  resolve: (result: SearchResult) => void
  reject: (error: Error) => void
  cleanup: () => void
  aborted: boolean
}

const ENGINE_FILE = 'stockfish-19-lite-single.js'
const ENGINE_WASM_FILE = 'stockfish-19-lite-single.wasm'
const INIT_TIMEOUT_MS = 30_000
const MATE_SCORE_LIMIT = 100_000

export class EngineError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngineError'
  }
}

function abortError(): Error {
  return new DOMException('Поиск Stockfish отменён', 'AbortError')
}

/**
 * Builds a URL for files inside public/engine. BASE_URL is "./" for portable
 * deploys and "/some-project/" for GitHub Pages project sites.
 */
export function engineAssetUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL || './'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}engine/${fileName}`
}

export function engineFileHint(): string {
  return `${engineAssetUrl(ENGINE_FILE)} и ${engineAssetUrl(ENGINE_WASM_FILE)}`
}

/**
 * Small UCI wrapper around the single-threaded Stockfish WASM worker.
 * Searches are serialized, so a long analysis and an interactive "best move"
 * request can safely share the same engine instance.
 */
export class StockfishEngine {
  private worker: Worker | null = null
  private readonly workerUrl: string
  private readonly initPromise: Promise<void>
  private initResolve: (() => void) | null = null
  private initReject: ((error: Error) => void) | null = null
  private initTimer: ReturnType<typeof setTimeout> | null = null
  private ready = false
  private destroyed = false
  private active: ActiveSearch | null = null
  private queue: Promise<unknown> = Promise.resolve()

  constructor() {
    const pageBase =
      typeof window !== 'undefined'
        ? window.location.href
        : 'http://localhost/'
    const workerUrl = new URL(engineAssetUrl(ENGINE_FILE), pageBase)
    const wasmUrl = new URL(engineAssetUrl(ENGINE_WASM_FILE), pageBase)

    // Stockfish.js accepts the WASM location in the worker URL hash. Passing
    // it explicitly keeps both files tied to import.meta.env.BASE_URL instead
    // of relying on a hard-coded relative path.
    workerUrl.hash = encodeURIComponent(wasmUrl.href)
    this.workerUrl = workerUrl.href

    this.initPromise = new Promise<void>((resolve, reject) => {
      this.initResolve = resolve
      this.initReject = reject
    })

    this.startWorker()
  }

  init(): Promise<void> {
    return this.initPromise
  }

  private startWorker(): void {
    try {
      if (typeof Worker === 'undefined') {
        throw new EngineError('Браузер не поддерживает Web Workers.')
      }

      this.worker = new Worker(this.workerUrl)
      this.worker.addEventListener('message', this.handleMessage)
      this.worker.addEventListener('error', this.handleWorkerError)
      this.worker.addEventListener('messageerror', this.handleWorkerError)

      this.initTimer = setTimeout(() => {
        this.failInit(
          new EngineError(
            'Stockfish не запустился за 30 секунд. Проверьте, что файлы движка доступны по пути ' +
              engineFileHint(),
          ),
        )
      }, INIT_TIMEOUT_MS)

      this.post('uci')
    } catch (error) {
      this.failInit(
        error instanceof Error
          ? error
          : new EngineError('Не удалось создать Worker для Stockfish.'),
      )
    }
  }

  private post(command: string): void {
    this.worker?.postMessage(command)
  }

  private handleMessage = (event: MessageEvent): void => {
    const raw: unknown = event.data
    const line =
      typeof raw === 'string'
        ? raw
        : typeof raw === 'object' && raw !== null && 'data' in raw
          ? String((raw as { data: unknown }).data)
          : ''

    if (!line) return

    if (!this.ready) {
      if (line === 'uciok') {
        this.post('isready')
        return
      }
      if (line === 'readyok') {
        this.ready = true
        if (this.initTimer) {
          clearTimeout(this.initTimer)
          this.initTimer = null
        }
        // Keep the engine small and predictable on low-end devices.
        this.post('setoption name Hash value 16')
        this.post('setoption name MultiPV value 1')
        this.initResolve?.()
        this.initResolve = null
        this.initReject = null
        return
      }
      if (line.startsWith('info string') && line.toLowerCase().includes('error')) {
        this.failInit(new EngineError(line.replace(/^info string\s*/i, '')))
      }
      return
    }

    if (line.startsWith('info ')) {
      this.handleInfo(line)
      return
    }

    if (line.startsWith('bestmove')) {
      this.handleBestMove(line)
    }
  }

  private handleInfo(line: string): void {
    const active = this.active
    if (!active) return
    if (line.includes('lowerbound') || line.includes('upperbound')) return

    const multipv = /\bmultipv\s+(\d+)/.exec(line)
    if (multipv && multipv[1] !== '1') return

    const depthMatch = /\bdepth\s+(\d+)/.exec(line)
    const scoreMatch = /\bscore\s+(cp|mate)\s+(-?\d+)/.exec(line)
    const pvMatch = /\bpv\s+(.+)$/.exec(line)

    if (!depthMatch && !scoreMatch && !pvMatch) return

    const depth = depthMatch ? Number(depthMatch[1]) : active.info.depth
    const score = scoreMatch
      ? {
          type: scoreMatch[1] as 'cp' | 'mate',
          value: Math.max(
            -MATE_SCORE_LIMIT,
            Math.min(MATE_SCORE_LIMIT, Number(scoreMatch[2])),
          ),
        }
      : active.info.score

    const pv = pvMatch
      ? pvMatch[1].trim().split(/\s+/).slice(0, 12)
      : active.info.pv

    const info: SearchInfo = { depth, score, pv }
    active.info = info
    active.options.onInfo?.(info)
  }

  private handleBestMove(line: string): void {
    const active = this.active
    if (!active) return

    const match = /^bestmove\s+(\S+)/.exec(line)
    const rawMove = match?.[1]
    const bestMoveUci =
      rawMove && rawMove !== '(none)' && rawMove !== '0000' ? rawMove : null

    this.active = null
    active.cleanup()

    if (active.aborted) {
      active.reject(abortError())
      return
    }

    active.resolve({
      ...active.info,
      bestMoveUci,
    })
  }

  private handleWorkerError = (event: ErrorEvent | MessageEvent): void => {
    const detail =
      'message' in event && event.message
        ? event.message
        : 'не удалось загрузить WASM-файл движка'
    const error = new EngineError(
      `Ошибка Stockfish: ${detail}. Проверьте файлы ${engineFileHint()}.`,
    )

    if (!this.ready) {
      this.failInit(error)
      return
    }

    this.failActive(error)
  }

  private failInit(error: Error): void {
    if (this.initTimer) {
      clearTimeout(this.initTimer)
      this.initTimer = null
    }
    checkWorkerTerminate(this.worker)
    this.worker = null
    this.initReject?.(error)
    this.initResolve = null
    this.initReject = null
  }

  private failActive(error: Error): void {
    const active = this.active
    if (!active) return
    this.active = null
    active.cleanup()
    active.reject(error)
  }

  search(options: SearchOptions): Promise<SearchResult> {
    return this.enqueue(() => this.executeSearch(options))
  }

  private enqueue(task: () => Promise<SearchResult>): Promise<SearchResult> {
    const run = () => task()
    const result = this.queue.then(run, run)
    this.queue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  private async executeSearch(options: SearchOptions): Promise<SearchResult> {
    await this.initPromise

    if (this.destroyed) {
      throw new EngineError('Stockfish уже остановлен.')
    }
    if (options.signal?.aborted) {
      throw abortError()
    }
    if (!this.worker) {
      throw new EngineError('Stockfish недоступен.')
    }

    return new Promise<SearchResult>((resolve, reject) => {
      const info: SearchInfo = { depth: 0, score: null, pv: [] }

      const active: ActiveSearch = {
        options,
        info,
        resolve,
        reject,
        cleanup: () => undefined,
        aborted: false,
      }

      const onAbort = () => {
        if (this.active !== active || active.aborted) return
        active.aborted = true
        // Stockfish answers "stop" with a final bestmove; executeSearch then
        // rejects and the queue moves on to the next position.
        this.post('stop')
      }

      active.cleanup = () => {
        options.signal?.removeEventListener('abort', onAbort)
      }

      this.active = active
      options.signal?.addEventListener('abort', onAbort, { once: true })

      try {
        this.post(`position fen ${options.fen}`)
        const goCommand = options.movetime
          ? `go depth ${options.depth ?? 12} movetime ${options.movetime}`
          : `go depth ${options.depth ?? 12}`
        this.post(goCommand)
      } catch (error) {
        this.active = null
        active.cleanup()
        reject(
          error instanceof Error ? error : new EngineError('Ошибка движка.'),
        )
      }
    })
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.ready = false

    if (this.initTimer) {
      clearTimeout(this.initTimer)
      this.initTimer = null
    }

    this.initReject?.(new EngineError('Stockfish остановлен.'))
    this.initResolve = null
    this.initReject = null

    this.failActive(new EngineError('Stockfish остановлен.'))
    checkWorkerTerminate(this.worker)
    this.worker = null
  }
}

function checkWorkerTerminate(worker: Worker | null): void {
  if (!worker) return
  try {
    worker.terminate()
  } catch {
    // Ignore termination errors during teardown.
  }
}
