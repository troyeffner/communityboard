import type { ReactNode } from 'react'
import Link from 'next/link'

type NavLink = {
  href: string
  label: string
}

export function BoardHeader({
  title,
  subtitle,
  leftLink,
  rightLink,
}: {
  title: string
  subtitle?: string
  leftLink?: NavLink
  rightLink?: NavLink
}) {
  return (
    <header
      style={{
        border: '1px solid #d4dbe5',
        borderRadius: 12,
        background: '#fff',
        padding: '12px 14px',
        marginBottom: 12,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
      }}
    >
      {(leftLink || rightLink) ? (
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
          {leftLink ? <Link href={leftLink.href} style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}>{leftLink.label}</Link> : null}
          {rightLink ? <Link href={rightLink.href} style={{ color: '#1d4ed8', textDecoration: 'none' }}>{rightLink.label}</Link> : null}
        </nav>
      ) : null}
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>{title}</h1>
      {subtitle ? <p className="cb-muted-text" style={{ margin: '4px 0 0 0' }}>{subtitle}</p> : null}
    </header>
  )
}

export function BoardLayout({
  left,
  center,
  right,
  header,
  testId = 'board-layout-root',
}: {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  header?: ReactNode
  testId?: string
}) {
  return (
    <main className="cb-page-container" data-testid={testId}>
      {header}
      <div className="cbBoardLayoutColumns">
        <div>{left}</div>
        <div>{center}</div>
        <div>{right}</div>
      </div>
    </main>
  )
}
