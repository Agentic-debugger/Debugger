'use client'

import dynamic from 'next/dynamic'
import { useCallback, useRef, useState } from 'react'
import { Upload, FileCode, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-bg-1 rounded-lg animate-pulse">
      <span className="text-t-3 text-sm font-mono">Loading editor...</span>
    </div>
  ),
})

interface CodeEditorProps {
  value: string
  onChange: (code: string) => void
  filename: string
  onFilenameChange: (name: string) => void
  readOnly?: boolean
}

export function CodeEditor({
  value,
  onChange,
  filename,
  onFilenameChange,
  readOnly = false,
}: CodeEditorProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.py')) return
      onFilenameChange(file.name)
      const reader = new FileReader()
      reader.onload = (e) => onChange(e.target?.result as string)
      reader.readAsText(file)
    },
    [onChange, onFilenameChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const isEmpty = !value.trim()

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-2 border-b border-line rounded-t-xl">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-t-3" />
          <input
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            className="bg-transparent font-mono text-sm text-t-1 outline-none
                       border-b border-transparent focus:border-accent/50 transition-colors
                       w-48 placeholder:text-t-3"
            placeholder="script.py"
            aria-label="Filename"
          />
        </div>
        <div className="flex items-center gap-2">
          {value && (
            <button
              onClick={() => { onChange(''); onFilenameChange('script.py') }}
              className="p-1 rounded text-t-3 hover:text-t-2
                         hover:bg-bg-3 transition-colors cursor-pointer"
              aria-label="Clear editor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                       bg-bg-3 hover:bg-line-2 text-t-2 hover:text-t-1
                       border border-line transition-colors duration-200 cursor-pointer"
          >
            <Upload className="w-3 h-3" />
            Upload .py
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".py"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      </div>

      {/* Editor area */}
      <div
        className={cn(
          'relative flex-1 rounded-b-xl overflow-hidden',
          isDragging && 'ring-2 ring-accent ring-inset'
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isEmpty && !isDragging && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-10
                       bg-bg-1/90 cursor-pointer gap-3"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20
                           flex items-center justify-center">
              <Upload className="w-5 h-5 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-t-1">
                Drop a .py file or click to upload
              </p>
              <p className="text-xs text-t-3 mt-1">
                Or start typing Python code below
              </p>
            </div>
          </div>
        )}

        {isDragging && (
          <div className="absolute inset-0 z-20 flex items-center justify-center
                         bg-black/70 backdrop-blur-sm">
            <p className="text-accent font-medium font-mono">Drop your .py file</p>
          </div>
        )}

        <MonacoEditor
          height="100%"
          language="python"
          value={value}
          onChange={(val) => onChange(val ?? '')}
          options={{
            theme: 'vs-dark',
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            fontSize: 13,
            lineHeight: 20,
            fontLigatures: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            readOnly,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            bracketPairColorization: { enabled: true },
            formatOnPaste: true,
            tabSize: 4,
            wordWrap: 'off',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  )
}
