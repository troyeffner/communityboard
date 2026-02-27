import type { CSSProperties } from 'react'

export const uiTokens = {
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
  },
  radius: {
    sm: 8,
    md: 10,
    lg: 12,
  },
  border: {
    soft: '1px solid #e5e7eb',
    strong: '1px solid #cbd5e1',
    selected: '2px solid #ef4444',
  },
  typography: {
    label: 12,
    body: 13,
    helper: 13,
    selectedPill: 11,
    sectionTitle: 30,
  },
  colors: {
    textStrong: '#111827',
    muted: '#6b7280',
    bgPanel: '#ffffff',
    bgSubtle: '#f8fafc',
    selectedBg: '#fef2f2',
  },
  panel: {
    padding: 12,
  },
} as const

export const uiStyles = {
  panel: {
    border: uiTokens.border.soft,
    borderRadius: uiTokens.radius.lg,
    padding: uiTokens.panel.padding,
    background: uiTokens.colors.bgPanel,
  } satisfies CSSProperties,
  metaStrip: {
    minHeight: 64,
    border: uiTokens.border.soft,
    borderRadius: uiTokens.radius.sm,
    padding: uiTokens.spacing[2],
    display: 'grid',
    gap: uiTokens.spacing[2],
    alignItems: 'start',
  } satisfies CSSProperties,
  toolbar: {
    display: 'flex',
    gap: uiTokens.spacing[2],
    flexWrap: 'wrap',
    alignItems: 'center',
  } satisfies CSSProperties,
  itemCard: {
    textAlign: 'left',
    padding: 10,
    borderRadius: uiTokens.radius.md,
    border: uiTokens.border.soft,
    background: uiTokens.colors.bgPanel,
    color: uiTokens.colors.textStrong,
  } satisfies CSSProperties,
  itemCardSelected: {
    border: uiTokens.border.selected,
    background: uiTokens.colors.selectedBg,
  } satisfies CSSProperties,
  mutedText: {
    color: uiTokens.colors.muted,
  } satisfies CSSProperties,
} as const
