'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-text mb-2">發生錯誤</h2>
          <p className="text-text-muted mb-4 text-center max-w-md">
            {this.state.error?.message || '頁面載入時發生問題'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
          >
            重新嘗試
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
