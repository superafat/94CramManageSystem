import React from 'react'
import { Avatar, AvatarProps } from './Avatar'

export interface AvatarGroupProps {
  avatars: Array<AvatarProps & { id: string | number }>
  max?: number
  size?: AvatarProps['size']
  className?: string
}

export function AvatarGroup({ 
  avatars, 
  max = 5, 
  size = 'md', 
  className = '' 
}: AvatarGroupProps) {
  const displayAvatars = avatars.slice(0, max)
  const remainingCount = Math.max(0, avatars.length - max)

  return (
    <div className={`flex items-center ${className}`}>
      {displayAvatars.map((avatar, index) => (
        <div
          key={avatar.id}
          className="-ml-2 first:ml-0 relative ring-2 ring-white rounded-full"
          style={{ zIndex: displayAvatars.length - index }}
        >
          <Avatar
            src={avatar.src}
            alt={avatar.alt}
            fallback={avatar.fallback}
            size={size}
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className="-ml-2 relative ring-2 ring-white rounded-full"
          style={{ zIndex: 0 }}
        >
          <Avatar
            fallback={`+${remainingCount}`}
            size={size}
            className="bg-gray-300"
          />
        </div>
      )}
    </div>
  )
}
