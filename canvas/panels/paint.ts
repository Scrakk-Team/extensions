// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0

/**
 * Pintado del lienzo (canvas 2D).
 *
 * El contexto se pide como un SUBCONJUNTO de `CanvasRenderingContext2D` (lo que
 * este módulo usa de verdad) en vez del tipo completo: así la función se puede
 * probar con un doble (sin DOM) y no hay dos definiciones que se desincronicen.
 */

import type { Shape } from './board'

export type PaintContext = Pick<
  CanvasRenderingContext2D,
  | 'lineWidth'
  | 'strokeStyle'
  | 'fillStyle'
  | 'lineCap'
  | 'lineJoin'
  | 'font'
  | 'textAlign'
  | 'textBaseline'
  | 'save'
  | 'restore'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'rect'
  | 'arc'
  | 'closePath'
  | 'stroke'
  | 'fill'
  | 'fillRect'
  | 'clearRect'
  | 'fillText'
>

export interface PaintOptions {
  width: number
  height: number
  /** Papel del lienzo. */
  paper?: string
  /** Grilla fina (cada 24px). */
  gridColor?: string
  /** Grilla gruesa (cada 4 líneas): da el aire de plano. */
  gridStrongColor?: string
}

const GRID = 24
const GRID_EVERY = 4
const DEFAULT_PAPER = '#0b1a2b'
const DEFAULT_GRID = '#13273d'
const DEFAULT_GRID_STRONG = '#1b3a58'
const TEXT_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace'

/** Convierte un punto normalizado (0..1) a píxeles del canvas. */
function toPixels(point: [number, number], width: number, height: number): [number, number] {
  return [point[0] * width, point[1] * height]
}

function paintShape(ctx: PaintContext, shape: Shape, width: number, height: number): void {
  const points = shape.points.map((point) => toPixels(point, width, height))

  ctx.save()
  ctx.lineWidth = shape.width
  ctx.strokeStyle = shape.color
  ctx.fillStyle = shape.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (shape.kind) {
    case 'stroke':
    case 'line': {
      if (points.length === 1) {
        ctx.beginPath()
        ctx.arc(points[0][0], points[0][1], Math.max(shape.width / 2, 0.5), 0, Math.PI * 2)
        ctx.fill()
        break
      }
      ctx.beginPath()
      ctx.moveTo(points[0][0], points[0][1])
      for (const [x, y] of points.slice(1)) ctx.lineTo(x, y)
      ctx.stroke()
      break
    }

    case 'rect': {
      const [x1, y1] = points[0]
      const [x2, y2] = points[1] ?? points[0]
      const x = Math.min(x1, x2)
      const y = Math.min(y1, y2)
      ctx.beginPath()
      ctx.rect(x, y, Math.abs(x2 - x1), Math.abs(y2 - y1))
      if (shape.fill) ctx.fill()
      else ctx.stroke()
      break
    }

    case 'circle': {
      const [cx, cy] = points[0]
      const [ex, ey] = points[1] ?? points[0]
      const radius = Math.hypot(ex - cx, ey - cy)
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(radius, 0.5), 0, Math.PI * 2)
      if (shape.fill) ctx.fill()
      else ctx.stroke()
      break
    }

    case 'dot': {
      ctx.beginPath()
      ctx.arc(points[0][0], points[0][1], Math.max(shape.width, 1), 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'text': {
      const size = Math.min(64, Math.max(10, shape.width * 5))
      ctx.font = `600 ${size}px ${TEXT_FONT}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(shape.text ?? '', points[0][0], points[0][1])
      break
    }
  }

  ctx.restore()
}

/**
 * Pinta el lienzo entero: papel, grilla de plano y todas las figuras.
 *
 * Se repinta completo en cada cambio: el estado es chico (figuras acotadas) y
 * así no hay que llevar la cuenta de qué quedó sucio.
 */
export function paintBoard(ctx: PaintContext, shapes: Shape[], options: PaintOptions): void {
  const { width, height } = options
  const paper = options.paper ?? DEFAULT_PAPER
  const gridColor = options.gridColor ?? DEFAULT_GRID
  const gridStrongColor = options.gridStrongColor ?? DEFAULT_GRID_STRONG

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, width, height)

  ctx.lineWidth = 1
  for (let index = 1; index * GRID < width; index += 1) {
    ctx.strokeStyle = index % GRID_EVERY === 0 ? gridStrongColor : gridColor
    const x = index * GRID
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let index = 1; index * GRID < height; index += 1) {
    ctx.strokeStyle = index % GRID_EVERY === 0 ? gridStrongColor : gridColor
    const y = index * GRID
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  for (const shape of shapes) paintShape(ctx, shape, width, height)
}
