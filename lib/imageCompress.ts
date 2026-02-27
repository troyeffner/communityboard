export type CompressedImageResult = {
  blob: Blob
  width: number
  height: number
  bytes: number
  mime: string
  originalWidth: number
  originalHeight: number
  targetMaxBytes: number
  qualityUsed: number
  longestEdgeUsed: number
}

type DecodeResult = {
  source: CanvasImageSource
  width: number
  height: number
  autoOriented: boolean
  cleanup: () => void
}

type JpegMeta = {
  orientation: number
  rawWidth: number | null
  rawHeight: number | null
}

function getUint16(view: DataView, offset: number, littleEndian: boolean) {
  if (offset + 2 > view.byteLength) return null
  return view.getUint16(offset, littleEndian)
}

function getUint32(view: DataView, offset: number, littleEndian: boolean) {
  if (offset + 4 > view.byteLength) return null
  return view.getUint32(offset, littleEndian)
}

function parseExifOrientation(exifView: DataView) {
  if (exifView.byteLength < 8) return 1
  const little = exifView.getUint16(0, false) === 0x4949
  const big = exifView.getUint16(0, false) === 0x4d4d
  if (!little && !big) return 1
  const littleEndian = little
  const magic = getUint16(exifView, 2, littleEndian)
  if (magic !== 42) return 1
  const ifdOffset = getUint32(exifView, 4, littleEndian)
  if (ifdOffset === null) return 1
  if (ifdOffset + 2 > exifView.byteLength) return 1
  const entries = getUint16(exifView, ifdOffset, littleEndian)
  if (entries === null) return 1
  for (let i = 0; i < entries; i += 1) {
    const entryOffset = ifdOffset + 2 + i * 12
    if (entryOffset + 12 > exifView.byteLength) break
    const tag = getUint16(exifView, entryOffset, littleEndian)
    if (tag !== 0x0112) continue
    const type = getUint16(exifView, entryOffset + 2, littleEndian)
    const count = getUint32(exifView, entryOffset + 4, littleEndian)
    if (type !== 3 || count !== 1) return 1
    const value = getUint16(exifView, entryOffset + 8, littleEndian)
    if (!value) return 1
    if (value >= 1 && value <= 8) return value
    return 1
  }
  return 1
}

function parseJpegMeta(buffer: ArrayBuffer): JpegMeta {
  const view = new DataView(buffer)
  if (view.byteLength < 4) return { orientation: 1, rawWidth: null, rawHeight: null }
  if (view.getUint16(0, false) !== 0xffd8) return { orientation: 1, rawWidth: null, rawHeight: null }

  let offset = 2
  let orientation = 1
  let rawWidth: number | null = null
  let rawHeight: number | null = null

  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break
    const marker = view.getUint8(offset + 1)
    if (marker === 0xd9 || marker === 0xda) break

    const segmentLength = view.getUint16(offset + 2, false)
    const segmentStart = offset + 4
    const segmentEnd = offset + 2 + segmentLength
    if (segmentLength < 2 || segmentEnd > view.byteLength) break

    if (marker === 0xe1 && segmentLength >= 10) {
      const exifHeader =
        view.getUint8(segmentStart) === 0x45 &&
        view.getUint8(segmentStart + 1) === 0x78 &&
        view.getUint8(segmentStart + 2) === 0x69 &&
        view.getUint8(segmentStart + 3) === 0x66 &&
        view.getUint8(segmentStart + 4) === 0x00 &&
        view.getUint8(segmentStart + 5) === 0x00
      if (exifHeader) {
        const exifOffset = segmentStart + 6
        const exifLength = segmentEnd - exifOffset
        if (exifLength > 0) {
          orientation = parseExifOrientation(new DataView(buffer, exifOffset, exifLength))
        }
      }
    }

    const isSofMarker =
      marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
      marker === 0xc5 || marker === 0xc6 || marker === 0xc7 ||
      marker === 0xc9 || marker === 0xca || marker === 0xcb ||
      marker === 0xcd || marker === 0xce || marker === 0xcf

    if (isSofMarker && segmentLength >= 7) {
      rawHeight = view.getUint16(segmentStart + 1, false)
      rawWidth = view.getUint16(segmentStart + 3, false)
    }

    offset = segmentEnd
  }

  return { orientation, rawWidth, rawHeight }
}

async function decodeImage(file: File): Promise<DecodeResult> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        autoOriented: true,
        cleanup: () => bitmap.close(),
      }
    } catch {
      // fallback below
    }
  }

  const imageUrl = URL.createObjectURL(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('Failed to load image'))
    element.src = imageUrl
  })
  return {
    source: img,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    autoOriented: false,
    cleanup: () => URL.revokeObjectURL(imageUrl),
  }
}

function isSwapOrientation(value: number) {
  return value >= 5 && value <= 8
}

function normalizeOrientation(
  orientation: number,
  decodedWidth: number,
  decodedHeight: number,
  rawWidth: number | null,
  rawHeight: number | null,
  autoOriented: boolean
) {
  if (autoOriented) return 1
  if (orientation !== 3 && orientation !== 6 && orientation !== 8) return 1
  if (orientation === 6 || orientation === 8) {
    if (rawWidth && rawHeight) {
      if (decodedWidth === rawHeight && decodedHeight === rawWidth) return 1
      if (decodedWidth === rawWidth && decodedHeight === rawHeight) return orientation
    }
  }
  return orientation
}

function drawOrientedScaled(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  orientation: number,
  longestEdge: number
) {
  const orientedSrcWidth = isSwapOrientation(orientation) ? srcHeight : srcWidth
  const orientedSrcHeight = isSwapOrientation(orientation) ? srcWidth : srcHeight
  const longest = Math.max(orientedSrcWidth, orientedSrcHeight)
  const scale = longest > longestEdge ? longestEdge / longest : 1
  const width = Math.max(1, Math.round(orientedSrcWidth * scale))
  const height = Math.max(1, Math.round(orientedSrcHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  if (orientation === 3) {
    ctx.translate(width, height)
    ctx.rotate(Math.PI)
    ctx.drawImage(source, 0, 0, width, height)
  } else if (orientation === 6) {
    ctx.translate(width, 0)
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(source, 0, 0, height, width)
  } else if (orientation === 8) {
    ctx.translate(0, height)
    ctx.rotate(-Math.PI / 2)
    ctx.drawImage(source, 0, 0, height, width)
  } else {
    ctx.drawImage(source, 0, 0, width, height)
  }

  return { canvas, width, height }
}

function dataUrlToBlob(dataUrl: string) {
  const parts = dataUrl.split(',')
  if (parts.length !== 2) throw new Error('Encoding failed')
  const mimeMatch = parts[0].match(/data:([^;]+);base64/)
  const mime = mimeMatch?.[1] || 'image/jpeg'
  const binary = atob(parts[1])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

async function encodeCanvas(canvas: HTMLCanvasElement, quality: number) {
  if (typeof canvas.toBlob !== 'function') {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    return dataUrlToBlob(dataUrl)
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Encoding failed'))
      resolve(blob)
    }, 'image/jpeg', quality)
  })
}

export async function compressPosterImage(file: File, maxBytes = 2_000_000): Promise<CompressedImageResult> {
  const maybeJpegMeta = file.type === 'image/jpeg' ? parseJpegMeta(await file.arrayBuffer()) : { orientation: 1, rawWidth: null, rawHeight: null }
  const decoded = await decodeImage(file)
  try {
    const longEdges = [2048, 1600, 1280]
    const qualities = [0.86, 0.78, 0.7, 0.62, 0.54]
    const orientation = normalizeOrientation(
      maybeJpegMeta.orientation,
      decoded.width,
      decoded.height,
      maybeJpegMeta.rawWidth,
      maybeJpegMeta.rawHeight,
      decoded.autoOriented
    )
    const originalWidth = isSwapOrientation(orientation) ? decoded.height : decoded.width
    const originalHeight = isSwapOrientation(orientation) ? decoded.width : decoded.height

    let best: CompressedImageResult | null = null

    for (const edge of longEdges) {
      const { canvas, width, height } = drawOrientedScaled(decoded.source, decoded.width, decoded.height, orientation, edge)
      for (const quality of qualities) {
        const blob = await encodeCanvas(canvas, quality)
        const candidate: CompressedImageResult = {
          blob,
          width,
          height,
          bytes: blob.size,
          mime: blob.type || 'image/jpeg',
          originalWidth,
          originalHeight,
          targetMaxBytes: maxBytes,
          qualityUsed: quality,
          longestEdgeUsed: edge,
        }
        if (!best || candidate.bytes < best.bytes) best = candidate
        if (candidate.bytes <= maxBytes) return candidate
      }
    }

    if (!best) throw new Error('Compression failed')
    return best
  } finally {
    decoded.cleanup()
  }
}
