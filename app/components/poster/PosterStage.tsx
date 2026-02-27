'use client'

import type { MouseEventHandler, RefObject, SyntheticEvent } from 'react'
import { uiTokens } from '@/lib/uiTokens'

type StagePin = {
  link_id: string
  event_id: string
  title: string
  bbox: { x: number; y: number }
}

type StageMetrics = {
  offsetX: number
  offsetY: number
  baseW: number
  baseH: number
}

export default function PosterStage({
  stageRef,
  imageUrl,
  loadError,
  pan,
  zoom,
  stageMetrics,
  pins,
  selectedEventId,
  onStageMouseDown,
  onStageMouseMove,
  onStageMouseUp,
  onStageMouseLeave,
  onImageLoad,
  onImageError,
  onPinClick,
}: {
  stageRef: RefObject<HTMLDivElement | null>
  imageUrl: string
  loadError: string
  pan: { x: number; y: number }
  zoom: number
  stageMetrics: StageMetrics
  pins: StagePin[]
  selectedEventId: string | null
  onStageMouseDown: MouseEventHandler<HTMLDivElement>
  onStageMouseMove: MouseEventHandler<HTMLDivElement>
  onStageMouseUp: MouseEventHandler<HTMLDivElement>
  onStageMouseLeave: MouseEventHandler<HTMLDivElement>
  onImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void
  onImageError: (event: SyntheticEvent<HTMLImageElement>) => void
  onPinClick: (pin: StagePin) => void
}) {
  return (
    <div
      ref={stageRef}
      data-testid="poster-stage"
      onMouseDown={onStageMouseDown}
      onMouseMove={onStageMouseMove}
      onMouseUp={onStageMouseUp}
      onMouseLeave={onStageMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        border: uiTokens.border.soft,
        borderRadius: uiTokens.radius.md,
        overflow: 'hidden',
        minHeight: 320,
        height: '100%',
        background: uiTokens.colors.bgSubtle,
      }}
    >
      {imageUrl ? (
        <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'top left' }}>
          <img
            src={imageUrl}
            alt="Poster"
            onLoad={onImageLoad}
            onError={onImageError}
            draggable={false}
            style={{
              position: 'absolute',
              left: `${stageMetrics.offsetX}px`,
              top: `${stageMetrics.offsetY}px`,
              width: `${stageMetrics.baseW}px`,
              height: `${stageMetrics.baseH}px`,
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none',
            }}
          />
          {pins.map((pin) => {
            const active = selectedEventId === pin.event_id
            return (
              <button
                key={pin.link_id}
                type="button"
                title={pin.title}
                data-testid={`poster-pin-${pin.event_id}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onPinClick(pin)
                }}
                style={{
                  position: 'absolute',
                  left: `${stageMetrics.offsetX + pin.bbox.x * stageMetrics.baseW}px`,
                  top: `${stageMetrics.offsetY + pin.bbox.y * stageMetrics.baseH}px`,
                  transform: 'translate(-50%, -50%)',
                  width: active ? 18 : 12,
                  height: active ? 18 : 12,
                  borderRadius: 999,
                  background: active ? '#ef4444' : '#22c55e',
                  border: '2px solid #fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                  cursor: 'pointer',
                }}
              />
            )
          })}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#6b7280', padding: 12, textAlign: 'center' }}>
          {loadError || 'Poster image unavailable for this record.'}
        </div>
      )}
    </div>
  )
}
