'use client'

import dynamic from 'next/dynamic'
import { useCallback, useRef, useState } from 'react'
import { Upload, FileCode, X, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-bg-2 animate-pulse">
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
  const editorRef = useRef<any>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.py')) return
      onFilenameChange(file.name)
      const reader = new FileReader()
      reader.onload = (e) => onChange(e.target?.result as string)
      reader.readAsText(file)
    },
    [onChange, onFilenameChange],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // reset so same file can be re-selected
    e.target.value = ''
  }

  const focusEditor = () => editorRef.current?.focus()

  const isEmpty = !value.trim()

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-2 border-b border-line rounded-t-xl">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-t-3 flex-shrink-0" />
          <input
            value={filename}
            onChange={(e) => onFilenameChange(e.target.value)}
            className="bg-transparent font-mono text-sm text-t-1 outline-none
                       border-b border-transparent focus:border-t-2 transition-colors
                       w-48 placeholder:text-t-3"
            placeholder="script.py"
            aria-label="Filename"
          />
        </div>

        <div className="flex items-center gap-2">
          {value && (
            <button
              onClick={() => { onChange(''); onFilenameChange('script.py') }}
              className="p-1 rounded text-t-3 hover:text-t-2 hover:bg-bg-3 transition-colors cursor-pointer"
              aria-label="Clear editor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium
                       bg-bg border border-line-2 text-t-2 hover:text-t-1 hover:border-accent
                       transition-colors duration-200 cursor-pointer"
            aria-label="Upload Python file"
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

      {/* ── Editor area ──────────────────────────────────────────── */}
      <div
        className={cn(
          'relative flex-1 rounded-b-xl overflow-hidden',
          isDragging && 'ring-2 ring-accent ring-inset',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={(e) => {
          // only clear if leaving the container, not a child
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false)
          }
        }}
        onDrop={handleDrop}
      >
        {/* Monaco is ALWAYS rendered and interactive */}
        <MonacoEditor
          height="100%"
          language="python"
          value={value}
          onChange={(val) => onChange(val ?? '')}
          onMount={(editor) => { editorRef.current = editor }}
          options={{
            theme: 'vs',
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
            // show a cursor hint when empty
            cursorBlinking: 'smooth',
            cursorStyle: 'line',
          }}
        />

        {/* Empty-state card — pointer-events-none so Monaco stays clickable */}
        {isEmpty && !isDragging && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div
              className="pointer-events-auto flex flex-col items-center gap-4 px-7 py-6
                         rounded-2xl bg-white/90 backdrop-blur-sm border border-line shadow-sm
                         text-center"
            >
              <div className="w-11 h-11 rounded-xl bg-bg-2 border border-line flex items-center justify-center">
                <Upload className="w-5 h-5 text-t-2" />
              </div>

              <div>
                <p className="text-sm font-medium text-t-1 mb-1">
                  Drop a .py file to load it
                </p>
                <p className="text-xs text-t-3">
                  or upload from your computer, or type directly in the editor
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary text-xs"
                  style={{ height: '34px', padding: '0 16px' }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Browse file
                </button>
                <button
                  onClick={focusEditor}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  style={{ height: '34px', padding: '0 14px' }}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  Type code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Drag-and-drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3
                          bg-white/80 backdrop-blur-sm border-2 border-dashed border-accent rounded-b-xl">
            <div className="w-12 h-12 rounded-xl bg-bg-2 border border-line flex items-center justify-center">
              <Upload className="w-5 h-5 text-t-1" />
            </div>
            <p className="text-sm font-medium text-t-1 font-mono">Drop your .py file here</p>
          </div>
        )}
      </div>
    </div>
  )
}
