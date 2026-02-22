import React from 'react'

export interface AvatarProps {
  src?: string
  alt?: string
  fallback?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeStyles = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
}

export function Avatar({ 
  src, 
  alt = 'Avatar', 
  fallback, 
  size = 'md', 
  className = '' 
}: AvatarProps) {
  const [imageError, setImageError] = React.useState(false)

  const getFallbackText = () => {
    if (fallback) {
      return fallback.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
    }
    return alt.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  return (
    <div
      className={`
        relative inline-flex items-center justify-center
        rounded-full bg-gray-200 overflow-hidden
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="font-medium text-gray-600">
          {getFallbackText()}
        </span>
      )}
    </div>
  )
}
