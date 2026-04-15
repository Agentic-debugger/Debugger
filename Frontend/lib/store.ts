'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  PipelineState,
  RunConfig,
  PipelineProgress,
  RunHistoryEntry,
} from './types'

interface AppStore {
  // Active run state
  currentRun: PipelineState | null
  progress: PipelineProgress | null
  isRunning: boolean

  // Persisted config
  config: RunConfig

  // Persisted run history
  history: RunHistoryEntry[]

  // Actions
  setCurrentRun: (run: PipelineState | null) => void
  setProgress: (progress: PipelineProgress | null) => void
  setIsRunning: (running: boolean) => void
  updateConfig: (patch: Partial<RunConfig>) => void
  addToHistory: (entry: RunHistoryEntry) => void
  removeFromHistory: (id: string) => void
  clearHistory: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentRun: null,
      progress: null,
      isRunning: false,

      config: {
        use_gemini_detection: true,
        use_llm_doc_format: true,
        max_iterations: 3,
      },

      history: [],

      setCurrentRun: (run) => set({ currentRun: run }),
      setProgress: (progress) => set({ progress }),
      setIsRunning: (isRunning) => set({ isRunning }),
      updateConfig: (patch) =>
        set((state) => ({ config: { ...state.config, ...patch } })),

      addToHistory: (entry) =>
        set((state) => ({
          history: [entry, ...state.history].slice(0, 100),
        })),

      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((r) => r.id !== id),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'sp202-app',
      partialize: (state) => ({
        history: state.history,
        config: state.config,
      }),
    }
  )
)
