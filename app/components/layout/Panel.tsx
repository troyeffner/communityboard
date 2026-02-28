import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  testId?: string
}

export function Panel({ title, subtitle, actions, children, className = '', testId }: PanelProps) {
  return (
    <section className={`cb-panel cbLayoutPanel ${className}`.trim()} data-testid={testId}>
      <header className="cbLayoutPanelHeader">
        <div className="cbLayoutPanelHeaderMain">
          <h2 className="cb-section-header cbLayoutPanelTitle">{title}</h2>
          {subtitle ? <p className="cb-muted-text cbLayoutPanelSubtitle">{subtitle}</p> : null}
        </div>
        {actions ? <PanelHeaderActions>{actions}</PanelHeaderActions> : null}
      </header>
      <div className="cbLayoutPanelBody">{children}</div>
    </section>
  )
}

export function PanelSection({ children }: { children: ReactNode }) {
  return <section className="cbLayoutPanelSection">{children}</section>
}

export function PanelHeaderActions({ children }: { children: ReactNode }) {
  return <div className="cbLayoutPanelHeaderActions">{children}</div>
}
