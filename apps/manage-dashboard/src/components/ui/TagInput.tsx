import React, { useState, KeyboardEvent, ChangeEvent } from 'react'

export interface TagInputProps {
  label?: string
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  error?: string
  helperText?: string
  className?: string
}

export function TagInput({
  label,
  tags,
  onChange,
  placeholder = '輸入後按 Enter 新增標籤',
  maxTags,
  error,
  helperText,
  className = ''
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      
      // 檢查是否達到最大標籤數
      if (maxTags && tags.length >= maxTags) {
        return
      }

      // 檢查是否重複
      if (!tags.includes(inputValue.trim())) {
        onChange([...tags, inputValue.trim()])
      }
      
      setInputValue('')
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // 刪除最後一個標籤
      onChange(tags.slice(0, -1))
    }
  }

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove))
  }

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div
        className={`
          w-full min-h-[42px] px-2 py-1 border rounded-md
          focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500
          ${error ? 'border-red-500 focus-within:ring-red-500' : 'border-gray-300'}
          ${className}
        `}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:text-blue-600 focus:outline-none"
                aria-label={`移除標籤 ${tag}`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
          
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={maxTags ? tags.length >= maxTags : false}
            className="flex-1 min-w-[120px] outline-none border-0 px-1 py-1 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
      {maxTags && (
        <p className="mt-1 text-xs text-gray-400">
          {tags.length} / {maxTags} 標籤
        </p>
      )}
    </div>
  )
}
