import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PipelineStatus, LoopStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(start: string, end: string | null): string {
  if (!end) return '—'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

export function pipelineStatusLabel(status: PipelineStatus): string {
  const map: Record<PipelineStatus, string> = {
    INIT: 'Running',
    DONE: 'Done',
    PARTIAL: 'Partial',
    ERROR: 'Error',
  }
  return map[status]
}

export function loopStatusLabel(status: LoopStatus | null): string {
  if (!status) return '—'
  const map: Record<LoopStatus, string> = {
    CLEAN: 'Clean',
    NO_IMPROVEMENT: 'No Improvement',
    MAX_ITERATIONS_REACHED: 'Max Iterations',
    ERROR: 'Error',
  }
  return map[status]
}

export function loopStatusColor(status: LoopStatus | null): string {
  if (!status) return 'text-t-3'
  const map: Record<LoopStatus, string> = {
    CLEAN: 'text-accent',
    NO_IMPROVEMENT: 'text-s_warn',
    MAX_ITERATIONS_REACHED: 'text-s_warn',
    ERROR: 'text-s_error',
  }
  return map[status]
}
