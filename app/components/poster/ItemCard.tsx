import type { ReactNode } from 'react'
import { uiStyles, uiTokens } from '@/lib/uiTokens'

export default function ItemCard({
  selected = false,
  title,
  subtitle,
  location,
  status,
  typeLabel,
  onClick,
  children,
  testId,
}: {
  selected?: boolean
  title: string
  subtitle?: string
  location?: string
  status?: string
  typeLabel?: string
  onClick?: () => void
  children?: ReactNode
  testId?: string
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      aria-selected={selected ? 'true' : 'false'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      data-testid={testId}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      style={{
        ...uiStyles.itemCard,
        ...(selected ? uiStyles.itemCardSelected : {}),
        ...(selected ? { border: uiTokens.border.strong, background: uiTokens.colors.bgSubtle, boxShadow: 'inset 3px 0 0 #94a3b8' } : {}),
        padding: uiTokens.spacing[2],
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {selected ? <div style={{ fontSize: uiTokens.typography.selectedPill, fontWeight: 700, color: uiTokens.colors.muted, marginBottom: 1 }}>Selected</div> : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>{title}</strong>
        {typeLabel ? (
          <span style={{ fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 999, padding: '2px 8px' }}>{typeLabel}</span>
        ) : null}
      </div>
      {subtitle ? <div style={{ fontSize: uiTokens.typography.label, marginTop: 3, ...uiStyles.mutedText }}>{subtitle}</div> : null}
      <div style={{ fontSize: uiTokens.typography.label, marginTop: 2, ...uiStyles.mutedText }}>{location || 'Location: —'}</div>
      {status ? <div style={{ fontSize: uiTokens.typography.label, marginTop: 2, ...uiStyles.mutedText }}>{status}</div> : null}
      {children ? <div style={{ marginTop: 8 }}>{children}</div> : null}
    </div>
  )
}
