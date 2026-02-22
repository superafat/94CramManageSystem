import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

const MORANDI_COLORS = {
  sage: '#8fa89a',
  rose: '#c9a9a6',
  blue: '#94a7b8',
  cream: '#f5f0eb',
  stone: '#9b9590',
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4"
          style={{ backgroundColor: MORANDI_COLORS.cream }}
        >
          <div 
            className="max-w-md w-full rounded-2xl p-8 text-center shadow-lg"
            style={{ 
              backgroundColor: 'white',
              border: `2px solid ${MORANDI_COLORS.stone}30`
            }}
          >
            {/* Icon */}
            <div 
              className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${MORANDI_COLORS.rose}30` }}
            >
              <svg 
                className="w-10 h-10" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke={MORANDI_COLORS.rose}
                strokeWidth={2}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>

            {/* Title */}
            <h1 
              className="text-2xl font-bold mb-3"
              style={{ color: MORANDI_COLORS.stone }}
            >
              糟糕，出錯了
            </h1>

            {/* Description */}
            <p 
              className="mb-6 text-sm leading-relaxed"
              style={{ color: `${MORANDI_COLORS.stone}cc` }}
            >
              應用程式遇到意外錯誤。請重試或返回首頁。
            </p>

            {/* Error details (dev mode) */}
            {import.meta.env.DEV && this.state.error && (
              <details 
                className="mb-6 text-left rounded-lg p-3 text-xs"
                style={{ 
                  backgroundColor: MORANDI_COLORS.cream,
                  border: `1px solid ${MORANDI_COLORS.stone}20`
                }}
              >
                <summary 
                  className="cursor-pointer font-semibold mb-2"
                  style={{ color: MORANDI_COLORS.rose }}
                >
                  技術詳情
                </summary>
                <pre 
                  className="whitespace-pre-wrap overflow-auto max-h-32"
                  style={{ color: MORANDI_COLORS.stone }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ 
                  backgroundColor: MORANDI_COLORS.sage,
                  color: 'white'
                }}
              >
                重試
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:opacity-90 active:scale-95"
                style={{ 
                  backgroundColor: MORANDI_COLORS.cream,
                  color: MORANDI_COLORS.stone,
                  border: `1px solid ${MORANDI_COLORS.stone}40`
                }}
              >
                回首頁
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
