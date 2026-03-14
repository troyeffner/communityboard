import type { ReactNode } from 'react'
import type { CSSProperties } from 'react'

export default function PosterToolbar({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return <div className={`cb-toolbar ${className}`.trim()} style={style}>{children}</div>
}
