import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
  testId?: string
}

export function Panel({ title, subtitle, children, className = '', testId }: PanelProps) {
  return (
    <section className={`cbLayoutPanel ${className}`.trim()} data-testid={testId}>
      <header className="cbLayoutPanelHeader">
        <h2 className="cb-section-header">{title}</h2>
        {subtitle ? <p className="cb-muted-text">{subtitle}</p> : null}
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
