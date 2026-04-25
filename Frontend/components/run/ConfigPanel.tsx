'use client'

import { Switch } from '@radix-ui/react-switch'
import { Cpu, FileText, RefreshCw } from 'lucide-react'
import type { RunConfig } from '@/lib/types'

interface ConfigPanelProps {
  config: RunConfig
  onChange: (patch: Partial<RunConfig>) => void
  disabled?: boolean
}

export function ConfigPanel({ config, onChange, disabled }: ConfigPanelProps) {
  return (
    <div className="space-y-5">
      <p className="label">Pipeline options</p>

      <Row
        icon={<Cpu className="w-3.5 h-3.5 text-s_info" />}
        label="Gemini detection"
        desc="LLM cross-validation of AST findings"
        checked={config.use_gemini_detection}
        onCheckedChange={(v) => onChange({ use_gemini_detection: v })}
        disabled={disabled}
      />

      <Row
        icon={<FileText className="w-3.5 h-3.5 text-s_warn" />}
        label="LLM doc formatter"
        desc="Polish report with Gemini"
        checked={config.use_llm_doc_format}
        onCheckedChange={(v) => onChange({ use_llm_doc_format: v })}
        disabled={disabled}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-accent" />
            <span className="text-t-1" style={{ fontSize: '13px', fontWeight: 500 }}>Max iterations</span>
          </div>
          <span className="font-mono text-accent font-semibold" style={{ fontSize: '13px' }}>
            {config.max_iterations}
          </span>
        </div>
        <p className="text-t-3" style={{ fontSize: '12px' }}>Fix-validate loop passes (1–10)</p>
        <input
          type="range" min={1} max={10}
          value={config.max_iterations}
          disabled={disabled}
          onChange={(e) => onChange({ max_iterations: Number(e.target.value) })}
          className="w-full h-1 rounded-full appearance-none cursor-pointer accent-accent
                     disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--line-2)' }}
          aria-label="Max iterations"
        />
        <div className="flex justify-between font-mono text-t-3" style={{ fontSize: '11px' }}>
          <span>1</span><span>10</span>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, desc, checked, onCheckedChange, disabled }: {
  icon: React.ReactNode; label: string; desc: string
  checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-t-1" style={{ fontSize: '13px', fontWeight: 500 }}>{label}</p>
          <p className="text-t-3 mt-0.5" style={{ fontSize: '12px' }}>{desc}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className="relative inline-flex h-5 w-9 flex-shrink-0 mt-0.5 items-center rounded-full
                   cursor-pointer transition-colors duration-200
                   focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-bg
                   disabled:opacity-40 disabled:cursor-not-allowed
                   data-[state=checked]:bg-accent data-[state=unchecked]:bg-bg-3"
        style={{ border: '1px solid var(--line-2)' }}>
        <span className="pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white
                         shadow-sm transition-transform duration-200
                         data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5" />
      </Switch>
    </div>
  )
}
