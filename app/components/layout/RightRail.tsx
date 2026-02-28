import type { ReactNode } from 'react'
import { Panel } from './Panel'

export function PosterDetailsRail({
  title = 'Poster details',
  subtitle,
  children,
  testId,
}: {
  title?: string
  subtitle?: string
  children: ReactNode
  testId?: string
}) {
  return (
    <Panel title={title} subtitle={subtitle} className="cbPosterDetailsRail" testId={testId}>
      {children}
    </Panel>
  )
}

export function PosterDetailsList({ children }: { children: ReactNode }) {
  return (
    <div className="cbPosterDetailsList" data-testid="poster-details-list">
      {children}
    </div>
  )
}
