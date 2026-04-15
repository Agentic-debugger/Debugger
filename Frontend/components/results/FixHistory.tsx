'use client'

import { useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { ChevronDown, CheckCircle2, XCircle, Minus, Wrench } from 'lucide-react'
import type { LoopResult, LoopIteration } from '@/lib/types'

interface FixHistoryProps {
  loopResult: LoopResult
}

export function FixHistory({ loopResult }: FixHistoryProps) {
  const [open, setOpen] = useState<string[]>(['iteration-0'])

  if (!loopResult.history.length) {
    return (
      <div className="flex items-center justify-center py-12 text-t-3 text-sm">
        No fix iterations recorded
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Final status */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium',
        loopResult.status === 'CLEAN'                 && 'bg-accent/5 border-accent/20 text-accent',
        loopResult.status === 'NO_IMPROVEMENT'        && 'bg-s_warn/5 border-s_warn/20 text-s_warn',
        loopResult.status === 'MAX_ITERATIONS_REACHED' && 'bg-s_warn/5 border-s_warn/20 text-s_warn',
        loopResult.status === 'ERROR'                 && 'bg-s_error/5 border-s_error/20 text-s_error',
      )}>
        {loopResult.status === 'CLEAN'
          ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          : loopResult.status === 'ERROR'
            ? <XCircle className="w-4 h-4 flex-shrink-0" />
            : <Minus className="w-4 h-4 flex-shrink-0" />
        }
        <span>
          {loopResult.status === 'CLEAN'                  ? 'All issues resolved — code is clean' :
           loopResult.status === 'NO_IMPROVEMENT'         ? 'No further improvement possible' :
           loopResult.status === 'MAX_ITERATIONS_REACHED' ? `Stopped after ${loopResult.iteration} iterations` :
           'Loop ended with errors'}
        </span>
        <span className="ml-auto font-mono text-xs opacity-70">
          {loopResult.iteration} iteration{loopResult.iteration !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Iteration accordion */}
      <Accordion.Root
        type="multiple"
        value={open}
        onValueChange={setOpen}
        className="space-y-2"
      >
        {loopResult.history.map((iter, idx) => {
          const prev = loopResult.history[idx - 1]
          const delta = prev ? iter.error_count - prev.error_count : null

          return (
            <Accordion.Item
              key={idx}
              value={`iteration-${idx}`}
              className="border border-line rounded-lg overflow-hidden"
            >
              <Accordion.Trigger
                className="w-full flex items-center gap-3 px-4 py-3 text-left
                           bg-bg-2 hover:bg-bg-3 transition-colors duration-150
                           data-[state=open]:border-b data-[state=open]:border-line
                           cursor-pointer group"
              >
                {/* Iteration badge */}
                <div className="w-7 h-7 rounded-full bg-bg-3 border border-line flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-mono font-semibold text-t-2">
                    {iter.iteration}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-medium text-t-1">
                    Iteration {iter.iteration}
                  </span>
                  <Badge
                    variant={
                      iter.fix_status === 'CLEAN' ? 'ok' :
                      iter.fix_status === 'ERROR' ? 'error' : 'neutral'
                    }
                  >
                    {iter.fix_status}
                  </Badge>
                </div>

                {/* Error count + delta */}
                <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
                  <span className="text-t-3">
                    {iter.error_count} errors
                  </span>
                  {delta !== null && (
                    <span className={cn(
                      'font-semibold',
                      delta < 0 ? 'text-accent' : delta > 0 ? 'text-s_error' : 'text-t-3'
                    )}>
                      {delta < 0 ? delta : delta > 0 ? `+${delta}` : '±0'}
                    </span>
                  )}
                  {iter.fix_log.length > 0 && (
                    <span className="text-t-3">
                      {iter.fix_log.length} fix{iter.fix_log.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                </div>

                <ChevronDown
                  className="w-4 h-4 text-t-3 transition-transform duration-200
                             group-data-[state=open]:rotate-180 flex-shrink-0"
                />
              </Accordion.Trigger>

              <Accordion.Content
                className="data-[state=open]:animate-slide-up overflow-hidden"
              >
                <IterationDetail iter={iter} />
              </Accordion.Content>
            </Accordion.Item>
          )
        })}
      </Accordion.Root>
    </div>
  )
}

function IterationDetail({ iter }: { iter: LoopIteration }) {
  return (
    <div className="bg-bg-3/30 px-4 py-4 space-y-4">
      {/* Applied fixes */}
      {iter.fix_log.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-t-3 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Wrench className="w-3 h-3" />
            Applied Fixes
          </p>
          <div className="space-y-1.5">
            {iter.fix_log.map((fix, i) => (
              <div key={i} className="flex items-start gap-3 text-xs">
                <span className="font-mono text-accent flex-shrink-0">:{fix.line}</span>
                <span className="font-mono bg-bg-3 text-t-3 px-1.5 py-0.5 rounded flex-shrink-0">
                  {fix.type}
                </span>
                <span className="text-t-2 leading-relaxed">{fix.description}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-t-3 italic">No deterministic fixes applied this iteration</p>
      )}

      {/* Remaining errors */}
      {iter.errors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-t-3 uppercase tracking-wide mb-2">
            Remaining Errors ({iter.errors.length})
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {iter.errors.map((err, i) => (
              <p key={i} className="text-xs font-mono text-s_error/80 break-words">{err}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
