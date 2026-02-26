'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type Pin = {
  link_id: string
  event_id: string
  title: string
  bbox: { x: number; y: number } | null
}

type DragState = { x: number; y: number } | null
type PinchState = {
  distance: number
  scale: number
  tx: number
  ty: number
  midX: number
  midY: number
} | null
type TouchPoint = { clientX: number; clientY: number }

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function PosterViewer({
  imageUrls,
  pins,
  activeEventId,
}: {
  imageUrls: string[]
  pins: Pin[]
  activeEventId: string | null
}) {
  const router = useRouter()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<DragState>(null)
  const pinchRef = useRef<PinchState>(null)

  const [imageIndex, setImageIndex] = useState(0)
  const [imageNatural, setImageNatural] = useState({ w: 0, h: 0 })
  const [allFailed, setAllFailed] = useState(false)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })
  const [userInteracted, setUserInteracted] = useState(false)
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const validPins = useMemo(() => pins.filter((p) => p.bbox), [pins])
  const imageUrl = allFailed ? '' : (imageUrls[imageIndex] || imageUrls[0] || '')

  const fitScale = useMemo(() => {
    if (!imageNatural.w || !imageNatural.h || !stageSize.w || !stageSize.h) return 1
    return Math.min(stageSize.w / imageNatural.w, stageSize.h / imageNatural.h)
  }, [imageNatural, stageSize])

  const autoScale = 1

  const baseOffset = useMemo(() => {
    const totalScale = fitScale * autoScale
    const w = imageNatural.w * totalScale
    const h = imageNatural.h * totalScale
    return {
      x: (stageSize.w - w) / 2,
      y: (stageSize.h - h) / 2,
    }
  }, [fitScale, autoScale, imageNatural, stageSize])

  const effectiveScale = userInteracted ? scale : autoScale
  const effectiveTx = userInteracted ? translateX : baseOffset.x
  const effectiveTy = userInteracted ? translateY : baseOffset.y
  const totalScale = fitScale * effectiveScale

  function clampTranslation(nextX: number, nextY: number, withScale = effectiveScale) {
    const margin = 80
    const scaledW = imageNatural.w * fitScale * withScale
    const scaledH = imageNatural.h * fitScale * withScale

    let minX: number
    let maxX: number
    let minY: number
    let maxY: number

    if (scaledW <= stageSize.w) {
      const centered = (stageSize.w - scaledW) / 2
      minX = centered - margin
      maxX = centered + margin
    } else {
      minX = stageSize.w - margin - scaledW
      maxX = margin
    }

    if (scaledH <= stageSize.h) {
      const centered = (stageSize.h - scaledH) / 2
      minY = centered - margin
      maxY = centered + margin
    } else {
      minY = stageSize.h - margin - scaledH
      maxY = margin
    }

    return {
      x: clamp(nextX, minX, maxX),
      y: clamp(nextY, minY, maxY),
    }
  }

  function zoomTo(nextScaleRaw: number) {
    const nextScale = clamp(nextScaleRaw, 1, 5)
    const clamped = clampTranslation(effectiveTx, effectiveTy, nextScale)
    setUserInteracted(true)
    setScale(nextScale)
    setTranslateX(clamped.x)
    setTranslateY(clamped.y)
  }

  function touchDistance(t1: TouchPoint, t2: TouchPoint) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
  }

  function touchMid(t1: TouchPoint, t2: TouchPoint) {
    return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 }
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button data-variant="secondary" onClick={() => zoomTo(effectiveScale + 0.2)}>Zoom +</button>
        <button data-variant="secondary" onClick={() => zoomTo(effectiveScale - 0.2)}>Zoom -</button>
        <button
          data-variant="secondary"
          onClick={() => {
            setUserInteracted(false)
            setScale(1)
            setTranslateX(0)
            setTranslateY(0)
          }}
        >
          Reset
        </button>
      </div>

      <div
        ref={stageRef}
        onMouseDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setStageSize({ w: rect.width, h: rect.height })
          dragRef.current = { x: e.clientX, y: e.clientY }
          setIsDragging(true)
        }}
        onMouseMove={(e) => {
          if (!dragRef.current) return
          const dx = e.clientX - dragRef.current.x
          const dy = e.clientY - dragRef.current.y
          const clamped = clampTranslation(effectiveTx + dx, effectiveTy + dy)
          setUserInteracted(true)
          setTranslateX(clamped.x)
          setTranslateY(clamped.y)
          dragRef.current = { x: e.clientX, y: e.clientY }
        }}
        onMouseUp={() => {
          dragRef.current = null
          setIsDragging(false)
        }}
        onMouseLeave={() => {
          dragRef.current = null
          setIsDragging(false)
        }}
        onWheel={(e) => {
          e.preventDefault()
          zoomTo(effectiveScale + (e.deltaY < 0 ? 0.12 : -0.12))
        }}
        onTouchStart={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setStageSize({ w: rect.width, h: rect.height })

          const t1 = e.touches[0]
          const t2 = e.touches[1]
          if (t1 && t2) {
            const mid = touchMid(t1, t2)
            pinchRef.current = {
              distance: touchDistance(t1, t2),
              scale: effectiveScale,
              tx: effectiveTx,
              ty: effectiveTy,
              midX: mid.x,
              midY: mid.y,
            }
            dragRef.current = null
            setIsDragging(false)
            return
          }
          if (!t1) return
          dragRef.current = { x: t1.clientX, y: t1.clientY }
          pinchRef.current = null
          setIsDragging(true)
        }}
        onTouchMove={(e) => {
          const t1 = e.touches[0]
          const t2 = e.touches[1]
          if (t1 && t2 && pinchRef.current) {
            e.preventDefault()
            const start = pinchRef.current
            const nextDistance = touchDistance(t1, t2)
            const mid = touchMid(t1, t2)
            const nextScale = clamp(start.scale * (nextDistance / Math.max(1, start.distance)), 1, 5)
            const movedX = start.tx + (mid.x - start.midX)
            const movedY = start.ty + (mid.y - start.midY)
            const clamped = clampTranslation(movedX, movedY, nextScale)
            setUserInteracted(true)
            setScale(nextScale)
            setTranslateX(clamped.x)
            setTranslateY(clamped.y)
            return
          }

          if (!t1 || !dragRef.current) return
          const dx = t1.clientX - dragRef.current.x
          const dy = t1.clientY - dragRef.current.y
          const clamped = clampTranslation(effectiveTx + dx, effectiveTy + dy)
          setUserInteracted(true)
          setTranslateX(clamped.x)
          setTranslateY(clamped.y)
          dragRef.current = { x: t1.clientX, y: t1.clientY }
        }}
        onTouchEnd={(e) => {
          const t1 = e.touches[0]
          const t2 = e.touches[1]
          if (t1 && t2) return
          pinchRef.current = null
          if (t1) {
            dragRef.current = { x: t1.clientX, y: t1.clientY }
            setIsDragging(true)
          } else {
            dragRef.current = null
            setIsDragging(false)
          }
        }}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          height: '78vh',
          minHeight: 360,
          maxHeight: 900,
          background: '#f8fafc',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        {imageUrl ? (
          <div
            style={{
              position: 'absolute',
              left: effectiveTx,
              top: effectiveTy,
              width: imageNatural.w || 1,
              height: imageNatural.h || 1,
              transform: `scale(${totalScale})`,
              transformOrigin: 'top left',
            }}
          >
            <img
              src={imageUrl}
              alt="Poster"
              onLoad={(e) => {
                const rect = stageRef.current?.getBoundingClientRect()
                if (rect) setStageSize({ w: rect.width, h: rect.height })
                setImageNatural({
                  w: e.currentTarget.naturalWidth || 1,
                  h: e.currentTarget.naturalHeight || 1,
                })
                setAllFailed(false)
              }}
              onError={() => {
                setImageNatural({ w: 0, h: 0 })
                if (imageIndex < imageUrls.length - 1) {
                  setImageIndex((idx) => idx + 1)
                  return
                }
                setAllFailed(true)
              }}
              draggable={false}
              style={{
                width: imageNatural.w || '100%',
                height: imageNatural.h || '100%',
                display: 'block',
                userSelect: 'none',
              }}
            />
            {!allFailed && imageNatural.w > 0 && validPins.map((pin) => {
              const active = activeEventId === pin.event_id
              return (
                <button
                  key={pin.link_id}
                  type="button"
                  title={pin.title}
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`?event_id=${encodeURIComponent(pin.event_id)}`)
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pin.bbox!.x * 100}%`,
                    top: `${pin.bbox!.y * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: active ? 18 : 12,
                    height: active ? 18 : 12,
                    borderRadius: '999px',
                    background: active ? '#f97316' : '#22c55e',
                    border: active ? '3px solid #9a3412' : '2px solid #fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                    cursor: 'pointer',
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#6b7280', textAlign: 'center', padding: 12 }}>
            Poster image unavailable for this record.
          </div>
        )}
      </div>
    </div>
  )
}
