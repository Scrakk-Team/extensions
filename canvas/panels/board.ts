// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0

/**
 * Modelo del lienzo de la extensión Canvas.
 *
 * Vive en su propio módulo porque lo comparten DOS cosas que tienen que estar
 * conectadas: el panel (dibuja con el mouse y pinta) y el handler del tool de IA
 * (lo llena con lo que devolvió el modelo). Al ser el mismo módulo —
 * literalmente el mismo estado en memoria— lo que dibuja la IA aparece en el
 * panel al instante, sin IPC ni archivos intermedios.
 *
 * Los puntos están NORMALIZADOS (0..1): una figura que define la IA se ve igual
 * en cualquier tamaño de panel, y el mouse se normaliza al capturar.
 */

export type Point = [number, number]

export type ShapeKind = 'stroke' | 'line' | 'rect' | 'circle' | 'dot' | 'text'

/** Quién dibujó la figura: se ve distinto y el status lo dice. */
export type DrawnBy = 'user' | 'ai'

export interface Shape {
  kind: ShapeKind
  /** Puntos normalizados (0..1). */
  points: Point[]
  color: string
  width: number
  text?: string
  fill?: boolean
  by: DrawnBy
}

/** Tinta del usuario, y la de la IA (distinta: se ve de un vistazo quién dibujó). */
export const USER_INK = '#e6f1ff'
export const AI_INK = '#7dd3fc'

/** Colores que rota el botón del lápiz del panel. */
export const INK_COLORS: readonly string[] = [USER_INK, '#f7c948', '#4ade80', '#ff8fa3', '#c4b5fd']

/** Techo de figuras y de puntos por figura: la IA no puede llenar la memoria. */
export const MAX_SHAPES = 400
export const MAX_POINTS = 600

export const STROKE_WIDTH = 2.5

const KINDS: readonly ShapeKind[] = ['stroke', 'line', 'rect', 'circle', 'dot', 'text']

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function normalizePoint(x: number, y: number): Point {
  return [clamp01(x), clamp01(y)]
}

/** Color aceptado (hex o rgb/rgba); cualquier otra cosa se descarta. */
export function sanitizeColor(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)$/i.test(value)) return value
  return null
}

function sanitizeWidth(raw: unknown, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback
  return Math.min(40, Math.max(1, raw))
}

/** Un punto llega como `[x, y]` o como `{ x, y }` (los modelos mandan las dos). */
function readPoint(entry: unknown): Point | null {
  if (Array.isArray(entry) && entry.length >= 2) {
    const x = Number(entry[0])
    const y = Number(entry[1])
    return Number.isFinite(x) && Number.isFinite(y) ? normalizePoint(x, y) : null
  }
  if (entry && typeof entry === 'object') {
    const record = entry as Record<string, unknown>
    const x = Number(record.x)
    const y = Number(record.y)
    if (Number.isFinite(x) && Number.isFinite(y)) return normalizePoint(x, y)
  }
  return null
}

/** Cuántos puntos necesita como mínimo cada figura. */
function minPoints(kind: ShapeKind): number {
  return kind === 'line' || kind === 'rect' || kind === 'circle' ? 2 : 1
}

/**
 * Convierte lo que devolvió la IA en figuras válidas.
 *
 * Todo lo que entra se acota: tipo de figura de la lista, puntos dentro de
 * 0..1, cantidad y grosor con techo, color con formato conocido. Una figura
 * inválida se descarta sin romper el resto (el modelo puede equivocarse).
 */
export function sanitizeShapes(raw: unknown): Shape[] {
  if (!Array.isArray(raw)) return []
  const shapes: Shape[] = []

  for (const item of raw) {
    if (shapes.length >= MAX_SHAPES) break
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>

    const kind = KINDS.find((candidate) => candidate === record.kind)
    if (!kind) continue

    const points: Point[] = []
    const rawPoints = Array.isArray(record.points) ? record.points : []
    for (const entry of rawPoints) {
      if (points.length >= MAX_POINTS) break
      const point = readPoint(entry)
      if (point) points.push(point)
    }
    if (points.length === 0) continue
    // line/rect/circle necesitan 2 puntos: con uno solo se degenera en un punto.
    while (points.length < minPoints(kind)) points.push([points[0][0], points[0][1]])

    shapes.push({
      kind,
      points,
      color: sanitizeColor(record.color) ?? AI_INK,
      width: sanitizeWidth(record.width, kind === 'text' ? 3 : STROKE_WIDTH),
      text: kind === 'text' ? String(record.text ?? '').slice(0, 120) : undefined,
      fill: record.fill === true,
      by: 'ai'
    })
  }

  return shapes
}

// ── Estado (store) ─────────────────────────────────────────────────────────

let shapes: Shape[] = []
const listeners = new Set<() => void>()

function commit(next: Shape[]): void {
  shapes = next.length > MAX_SHAPES ? next.slice(next.length - MAX_SHAPES) : next
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch {
      // Un suscriptor roto no tumba a los demás.
    }
  }
}

export const board = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /**
   * Snapshot para `useSyncExternalStore`: la MISMA referencia mientras no haya
   * cambios (si devolviera una copia nueva en cada render, React reintentaría
   * el render para siempre).
   */
  getShapes(): Shape[] {
    return shapes
  },

  count(): number {
    return shapes.length
  },

  clear(): void {
    if (shapes.length > 0) commit([])
  },

  /** Última figura dibujada por quién (para el status del panel). */
  lastBy(): DrawnBy | null {
    const last = shapes[shapes.length - 1]
    return last ? last.by : null
  },

  add(next: Shape[]): number {
    if (next.length === 0) return 0
    commit([...shapes, ...next])
    return next.length
  },

  /**
   * Camino del tool de IA: sanea lo que mandó el modelo y lo agrega al lienzo.
   * Devuelve cuántas figuras entraron (0 = nada que dibujar).
   */
  draw(raw: unknown, clearFirst = false): number {
    const incoming = sanitizeShapes(raw)
    if (!clearFirst && incoming.length === 0) return 0
    if (clearFirst && incoming.length === 0 && shapes.length === 0) return 0
    commit([...(clearFirst ? [] : shapes), ...incoming])
    return incoming.length
  },

  // ── Trazo con el mouse ───────────────────────────────────────────────────
  // El trazo en curso es la ÚLTIMA figura del array: así el panel pinta todo
  // con el mismo código y no hay un estado "draft" aparte que sincronizar.

  beginStroke(point: Point, color: string = USER_INK, width: number = STROKE_WIDTH): void {
    commit([...shapes, { kind: 'stroke', points: [point], color, width, by: 'user' }])
  },

  extendStroke(point: Point): void {
    const last = shapes[shapes.length - 1]
    if (!last || last.kind !== 'stroke' || last.by !== 'user') return
    if (last.points.length >= MAX_POINTS) return
    const previous = last.points[last.points.length - 1]
    // Puntos pegados: no aportan nada al trazo (y el modelo no se llena de ruido).
    if (Math.abs(point[0] - previous[0]) < 0.002 && Math.abs(point[1] - previous[1]) < 0.002) {
      return
    }
    commit([...shapes.slice(0, -1), { ...last, points: [...last.points, point] }])
  }
}
