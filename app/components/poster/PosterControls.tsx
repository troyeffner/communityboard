import type { CSSProperties, ReactNode } from 'react'
import { uiStyles } from '@/lib/uiTokens'

export default function PosterControls({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return <div style={{ ...uiStyles.toolbar, ...style }}>{children}</div>
}
