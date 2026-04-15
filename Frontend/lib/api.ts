import type {
  PipelineState,
  RunConfig,
  PipelineProgress,
  RunHistoryEntry,
} from './types'

function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost'
    return `${window.location.protocol}//${host}:8000`
  }

  return 'http://localhost:8000'
}

type StreamEnvelope =
  | { type: 'progress'; progress: PipelineProgress }
  | { type: 'complete'; state: PipelineState }
  | { type: 'error'; message: string }

function handleNdjsonLine(
  line: string,
  onProgress: ((p: PipelineProgress) => void) | undefined,
): PipelineState | null {
  const t = line.trim()
  if (!t) return null
  const data = JSON.parse(t) as StreamEnvelope
  if (data.type === 'progress') {
    onProgress?.(data.progress)
    return null
  }
  if (data.type === 'complete') return data.state
  if (data.type === 'error')
    throw new Error(data.message || 'Pipeline failed')
  return null
}

// ─── Run Pipeline (streams progress lines from backend pipeline) ────────────────

export async function runPipeline(
  code: string,
  filename: string,
  config: RunConfig,
  onProgress?: (p: PipelineProgress) => void,
): Promise<PipelineState> {
  const formData = new FormData()
  const blob = new Blob([code], { type: 'text/plain' })
  formData.append('file', blob, filename)
  formData.append('use_gemini_detection', String(config.use_gemini_detection))
  formData.append('use_llm_doc_format', String(config.use_llm_doc_format))
  formData.append('max_iterations', String(config.max_iterations))

  const apiBase = resolveApiBase()
  let res: Response
  try {
    res = await fetch(`${apiBase}/run`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error(
      `Failed to reach backend at ${apiBase}. Make sure FastAPI is running on port 8000.`,
    )
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Server error: ${res.status}`)
  }

  const ct = res.headers.get('content-type') || ''

  // NDJSON stream from updated controller (matches Orchestration/pipeline.py)
  if (ct.includes('ndjson') || ct.includes('x-ndjson')) {
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')
    const decoder = new TextDecoder()
    let buffer = ''
    let finalState: PipelineState | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (value) buffer += decoder.decode(value, { stream: true })

      const parts = buffer.split('\n')
      buffer = parts.pop() ?? ''
      for (const line of parts) {
        const st = handleNdjsonLine(line, onProgress)
        if (st) finalState = st
      }
      if (done) break
    }

    if (buffer.trim()) {
      const st = handleNdjsonLine(buffer, onProgress)
      if (st) finalState = st
    }

    if (!finalState) {
      throw new Error('Pipeline stream ended without a result')
    }
    return finalState
  }

  // Fallback: single JSON body (older server)
  return res.json() as Promise<PipelineState>
}

// ─── Deprecated: use runPipeline(…, onProgress) instead of EventSource ───────────

/** @deprecated Progress is streamed from POST /run (NDJSON). */
export function streamPipelineProgress(
  _runId: string,
  _onProgress: (p: PipelineProgress) => void,
  _onComplete: (state: PipelineState) => void,
  onError: (msg: string) => void,
): () => void {
  onError('Use runPipeline with onProgress — streaming is part of POST /run')
  return () => {}
}

// ─── Results ─────────────────────────────────────────────────────────────────

export async function getRunResult(id: string): Promise<PipelineState> {
  const res = await fetch(`${resolveApiBase()}/results/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch result: ${res.status}`)
  return res.json()
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function getRunHistory(): Promise<RunHistoryEntry[]> {
  const res = await fetch(`${resolveApiBase()}/history`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export async function deleteRun(id: string): Promise<void> {
  const res = await fetch(`${resolveApiBase()}/history/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete run')
}

// ─── Report Export ─────────────────────────────────────────────────────────────

export function getReportDownloadUrl(id: string, format: 'md' | 'html' = 'md') {
  return `${resolveApiBase()}/results/${id}/report?format=${format}`
}
