'use client'

import { useState } from 'react'

interface TagInputProps {
  label: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ label, tags, onChange, placeholder = '輸入後按 Enter' }: TagInputProps) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()])
      }
      setInput('')
    }
  }

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
            {tag}
            <button onClick={() => handleRemove(i)} className="hover:text-danger ml-1">&times;</button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}
