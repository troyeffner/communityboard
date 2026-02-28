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
    <header className="cbBoardHeader">
      {(leftLink || rightLink) ? (
        <nav className="cbBoardHeaderNav" aria-label="Board navigation">
          {leftLink ? (
            <Link href={leftLink.href} className="cbBoardHeaderNavLink cbBoardHeaderNavLinkStrong">
              {leftLink.label}
            </Link>
          ) : null}
          {rightLink ? (
            <Link href={rightLink.href} className="cbBoardHeaderNavLink">
              {rightLink.label}
            </Link>
          ) : null}
        </nav>
      ) : null}
      <h1 className="cbBoardHeaderTitle">{title}</h1>
      {subtitle ? <p className="cbBoardHeaderSubtitle">{subtitle}</p> : null}
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
    <main className="cb-page-container cbBoardLayout" data-testid={testId}>
      {header ? <div className="cbBoardHeaderWrap">{header}</div> : null}
      <div className="cbBoardLayoutColumns">
        <aside className="cbBoardLayoutCol cbBoardLayoutColLeft">{left}</aside>
        <section className="cbBoardLayoutCol cbBoardLayoutColCenter">{center}</section>
        <aside className="cbBoardLayoutCol cbBoardLayoutColRight">{right}</aside>
      </div>
    </main>
  )
}
