import type { ReactNode } from 'react'
import { uiStyles, uiTokens } from '@/lib/uiTokens'

type MetaItem = {
  label: string
  value: ReactNode
}

export default function PosterMetaStrip({ items }: { items: MetaItem[] }) {
  return (
    <div
      style={{
        ...uiStyles.metaStrip,
        minHeight: 'unset',
        padding: uiTokens.spacing[1],
        gap: uiTokens.spacing[1],
        gridTemplateColumns: `repeat(${Math.max(1, items.length)}, minmax(0, 1fr))`,
        alignItems: 'center',
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', gap: uiTokens.spacing[1], alignItems: 'baseline', minWidth: 0 }}>
          <div style={{ fontSize: uiTokens.typography.selectedPill, color: uiTokens.colors.muted, whiteSpace: 'nowrap' }}>{item.label}:</div>
          <div style={{ fontSize: uiTokens.typography.body, color: uiTokens.colors.textStrong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
