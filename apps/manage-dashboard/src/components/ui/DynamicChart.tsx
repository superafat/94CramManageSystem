'use client'

import { lazy, Suspense, ComponentType } from 'react'

// Dynamic imports for Chart.js components
const LazyLine = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Line })))
const LazyBar = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Bar })))
const LazyPie = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Pie })))
const LazyDoughnut = lazy(() => import('react-chartjs-2').then(mod => ({ default: mod.Doughnut })))

interface ChartProps {
  type: 'line' | 'bar' | 'pie' | 'doughnut'
  data: any
  options?: any
  fallback?: React.ReactNode
}

const ChartLoadingFallback = () => (
  <div className="flex items-center justify-center h-64 bg-surface rounded-2xl border border-border">
    <div className="text-center">
      <div className="animate-spin text-4xl mb-2">📊</div>
      <p className="text-sm text-text-muted">載入圖表中...</p>
    </div>
  </div>
)

export function DynamicChart({ type, data, options, fallback }: ChartProps) {
  let ChartComponent: ComponentType<any>

  switch (type) {
    case 'line':
      ChartComponent = LazyLine
      break
    case 'bar':
      ChartComponent = LazyBar
      break
    case 'pie':
      ChartComponent = LazyPie
      break
    case 'doughnut':
      ChartComponent = LazyDoughnut
      break
    default:
      throw new Error(`Unknown chart type: ${type}`)
  }

  return (
    <Suspense fallback={fallback || <ChartLoadingFallback />}>
      <ChartComponent data={data} options={options} />
    </Suspense>
  )
}

// Preload function for better UX
export function preloadCharts() {
  if (typeof window !== 'undefined') {
    import('react-chartjs-2')
    import('chart.js/auto')
  }
}
