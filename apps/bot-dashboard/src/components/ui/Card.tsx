export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface rounded-2xl border border-border p-6 ${className}`}>
      {title && <h2 className="text-lg font-semibold text-text mb-4">{title}</h2>}
      {children}
    </div>
  )
}
