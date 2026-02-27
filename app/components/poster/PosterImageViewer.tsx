import type { ReactNode } from 'react'
import PosterToolbar from './PosterToolbar'

export default function PosterImageViewer({
  controls,
  children,
  footer,
}: {
  controls?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 8, minHeight: 0 }}>
      {controls ? <PosterToolbar>{controls}</PosterToolbar> : null}
      {children}
      {footer || null}
    </div>
  )
}
