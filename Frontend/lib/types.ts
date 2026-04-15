// ─── Detection ──────────────────────────────────────────────────────────────

export interface Finding {
  line: number
  type: string
  severity: 'Error' | 'Warning'
  diagnosis: string
  neutralization: string
  source?: 'AST' | 'Gemini' | 'merged'
}

export interface BugReport {
  status: 'CLEAN' | 'FLAGGED'
  critical_count: number
  findings: Finding[]
}

export interface AstReport {
  status: string
  findings: Finding[]
}

// ─── Fix Loop ────────────────────────────────────────────────────────────────

export interface FixLogEntry {
  line: number
  type: string
  description: string
}

export interface LoopIteration {
  iteration: number
  fix_status: string
  error_count: number
  errors: string[]
  fix_log: FixLogEntry[]
}

export type LoopStatus =
  | 'CLEAN'
  | 'NO_IMPROVEMENT'
  | 'MAX_ITERATIONS_REACHED'
  | 'ERROR'

export interface LoopResult {
  status: LoopStatus
  iteration: number
  final_code: string
  history: LoopIteration[]
}

// ─── Documentation ───────────────────────────────────────────────────────────

export interface DocumentationResult {
  status: 'DOCUMENTED' | 'ERROR'
  markdown: string
  output_path: string
  error?: string
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export type PipelineStatus = 'INIT' | 'DONE' | 'PARTIAL' | 'ERROR'

export interface PipelineState {
  id: string
  status: PipelineStatus
  source_path: string
  started_at: string
  finished_at: string | null
  original_code: string
  bug_report: BugReport | null
  ast_report: AstReport | null
  loop_result: LoopResult | null
  documentation_result: DocumentationResult | null
  errors: string[]
}

// ─── Run Config ──────────────────────────────────────────────────────────────

export interface RunConfig {
  use_gemini_detection: boolean
  use_llm_doc_format: boolean
  max_iterations: number
}

// ─── Progress (SSE) ──────────────────────────────────────────────────────────

export type PipelinePhase = 'detection' | 'fixing' | 'documentation' | 'done'

/** Top-level pipeline stages aligned with backend `Orchestration/pipeline.py`. */
export type PipelineStage = 'detector' | 'fixer' | 'documentation'

export interface PipelineProgress {
  phase: PipelinePhase
  /** Active macro stage (Detector → Fixer → Documentation). Preferred over inferring from `phase`. */
  stage?: PipelineStage
  iteration?: number
  max_iterations?: number
  error_count?: number
  message?: string
  /** Legacy fine-grained step index; optional when using `stage`. */
  rail_index?: number
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface RunHistoryEntry {
  id: string
  filename: string
  status: PipelineStatus
  loop_status: LoopStatus | null
  started_at: string
  finished_at: string | null
  iteration_count: number
  critical_count: number
}
