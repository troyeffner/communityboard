import type { ReactNode } from 'react'
import { uiTokens } from '@/lib/uiTokens'

export default function PosterItemsList({
  title = 'Poster details',
  children,
  maxHeight,
}: {
  title?: string
  children: ReactNode
  maxHeight?: number
}) {
  return (
    <div style={{ marginTop: uiTokens.spacing[3] }}>
      {title ? <h3 className="cb-section-header" style={{ marginTop: 6 }}>{title}</h3> : null}
      <div style={{ display: 'grid', gap: uiTokens.spacing[2], ...(maxHeight ? { maxHeight, overflow: 'auto' as const } : {}) }}>
        {children}
      </div>
    </div>
  )
}
