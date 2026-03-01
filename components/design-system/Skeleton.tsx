// components/design-system/Skeleton.tsx
import * as React from 'react'

export const Skeleton: React.FC<{ className?: string; shape?: 'rect' | 'circle'; animated?: boolean }> = ({
  className = '',
  shape = 'rect',
  animated = true,
}) => {
  return (
    <div
      className={[
        animated ? 'relative overflow-hidden before:absolute before:inset-0 before:animate-[shimmer_1.7s_linear_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent' : '',
        shape === 'circle' ? 'rounded-full' : 'rounded-ds',
        'bg-muted/80',
        className,
      ].join(' ')}
    />
  )
}

export default Skeleton
