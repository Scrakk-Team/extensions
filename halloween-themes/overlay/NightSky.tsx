// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * NightSky — background que aporta el pack de Halloween.
 *
 * Escena por capas: luna de sangre, nubes que derivan, estrellas, murciélagos,
 * casona con ventanas encendidas, árboles muertos, lápidas y calabazas. La
 * niebla fría y las brasas reemplazan las dos manchas rojas planas que tenía la
 * versión anterior. El rayo del evento ilumina la escena un instante.
 *
 * Es un componente de la EXTENSIÓN: el IDE sólo lo monta detrás del contenido
 * cuando el evento lo pide. Sin CSS del IDE ni imports: sólo `react` y canvas
 * 2D, para que viaje compilado dentro del `.sef`.
 */

import { useEffect, useRef, type JSX } from 'react'
import { BAT_PATH, BAT_VIEWBOX, BAT_WING_ANCHOR, BAT_WING_CLIP } from './batShape'

interface OverlayProps {
  on: (name: string, handler: (payload: unknown) => void) => () => void
  event?: { id: string; name: string }
  props?: Record<string, unknown>
}

interface Star {
  x: number
  y: number
  r: number
  phase: number
  speed: number
  tint: string
  bright: boolean
}

interface Bat {
  x: number
  y: number
  scale: number
  speed: number
  phase: number
  flap: number
  drift: number
  dir: number
}

interface Ember {
  x: number
  y: number
  r: number
  speed: number
  phase: number
  alpha: number
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
}

interface RainDrop {
  x: number
  y: number
  len: number
  speed: number
  alpha: number
}

const TAU = Math.PI * 2
const MOON = { x: 0.76, y: 0.19, r: 0.072 }
const HOUSE = { x: 0.17, y: 0.845 }
const PUMPKINS = [{ x: 0.945, y: 0.815, s: 0.95 }]

/** PRNG determinista: la escena no cambia entre recargas ni entre equipos. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Luna de sangre: halo cálido, disco con cráteres y borde oscurecido. */
function drawMoon(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const mx = w * MOON.x
  const my = h * MOON.y
  const r = Math.min(w, h) * MOON.r

  const halo = ctx.createRadialGradient(mx, my, r * 0.3, mx, my, r * 3.4)
  halo.addColorStop(0, 'rgba(214, 228, 255, 0.2)')
  halo.addColorStop(0.32, 'rgba(164, 184, 228, 0.09)')
  halo.addColorStop(0.68, 'rgba(96, 116, 164, 0.025)')
  halo.addColorStop(1, 'rgba(20, 30, 60, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(mx - r * 3.4, my - r * 3.4, r * 6.8, r * 6.8)

  const disk = ctx.createRadialGradient(mx - r * 0.35, my - r * 0.42, r * 0.05, mx, my, r)
  disk.addColorStop(0, '#ffffff')
  disk.addColorStop(0.38, '#eef3ff')
  disk.addColorStop(0.72, '#c9d4ee')
  disk.addColorStop(0.92, '#9caaca')
  disk.addColorStop(1, '#7e8cad')
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, TAU)
  ctx.fillStyle = disk
  ctx.fill()

  const rng = mulberry32(1207)
  for (let i = 0; i < 9; i += 1) {
    const angle = rng() * TAU
    const distance = Math.sqrt(rng()) * r * 0.72
    const crater = (0.06 + rng() * 0.16) * r
    const cx = mx + Math.cos(angle) * distance
    const cy = my + Math.sin(angle) * distance
    const craterFill = ctx.createRadialGradient(
      cx - crater * 0.3,
      cy - crater * 0.3,
      0,
      cx,
      cy,
      crater
    )
    craterFill.addColorStop(0, 'rgba(92, 108, 142, 0.3)')
    craterFill.addColorStop(1, 'rgba(126, 142, 178, 0)')
    ctx.beginPath()
    ctx.arc(cx, cy, crater, 0, TAU)
    ctx.fillStyle = craterFill
    ctx.fill()
  }

  const rim = ctx.createRadialGradient(mx, my, r * 0.72, mx, my, r)
  rim.addColorStop(0, 'rgba(30, 40, 70, 0)')
  rim.addColorStop(1, 'rgba(26, 34, 58, 0.42)')
  ctx.beginPath()
  ctx.arc(mx, my, r, 0, TAU)
  ctx.fillStyle = rim
  ctx.fill()
}

/** Cerros en capas: le dan profundidad al horizonte. */
function drawHills(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const layers = [
    { base: 0.7, amp: 0.042, color: '#150a15', phase: 0.2 },
    { base: 0.78, amp: 0.048, color: '#0d0710', phase: 2.1 },
    { base: 0.86, amp: 0.032, color: '#070409', phase: 4.2 }
  ]

  for (const layer of layers) {
    const y = h * layer.base
    ctx.beginPath()
    ctx.moveTo(0, h)
    ctx.lineTo(0, y)
    const segments = 7
    for (let i = 0; i < segments; i += 1) {
      const x0 = (i / segments) * w
      const x1 = ((i + 1) / segments) * w
      const y0 = y - Math.sin(i * 1.7 + layer.phase) * h * layer.amp
      const y1 = y - Math.sin((i + 1) * 1.7 + layer.phase) * h * layer.amp
      ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - h * layer.amp * 0.3, x1, y1)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fillStyle = layer.color
    ctx.fill()
  }
}

/** Casona abandonada con dos ventanas apagadas. */
function drawHouse(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const s = Math.min(w, h) * 0.11
  const x = w * HOUSE.x
  const y = h * HOUSE.y

  ctx.save()
  ctx.translate(x, y)

  ctx.fillStyle = '#070308'
  ctx.fillRect(s * 0.16, -s * 1.04, s * 0.13, s * 0.34)

  ctx.beginPath()
  ctx.moveTo(-s * 0.38, 0)
  ctx.lineTo(-s * 0.38, -s * 0.54)
  ctx.lineTo(0, -s * 0.98)
  ctx.lineTo(s * 0.38, -s * 0.54)
  ctx.lineTo(s * 0.38, 0)
  ctx.closePath()
  ctx.fillStyle = '#08040a'
  ctx.fill()
  ctx.strokeStyle = 'rgba(120, 50, 60, 0.2)'
  ctx.lineWidth = Math.max(1, s * 0.012)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(-s * 0.09, 0)
  ctx.lineTo(-s * 0.09, -s * 0.3)
  ctx.lineTo(0, -s * 0.38)
  ctx.lineTo(s * 0.09, -s * 0.3)
  ctx.lineTo(s * 0.09, 0)
  ctx.closePath()
  ctx.fillStyle = '#050207'
  ctx.fill()

  const windows: Array<[number, number]> = [
    [-s * 0.28, -s * 0.47],
    [s * 0.12, -s * 0.47]
  ]
  for (const [wx, wy] of windows) {
    const ww = s * 0.16
    const wh = s * 0.19
    // Ventana apagada: color plano, sin halo ni degradado brillante.
    ctx.fillStyle = 'rgba(92, 52, 36, 0.72)'
    ctx.fillRect(wx, wy, ww, wh)
    ctx.strokeStyle = 'rgba(20, 6, 10, 0.92)'
    ctx.lineWidth = Math.max(1, s * 0.018)
    ctx.strokeRect(wx, wy, ww, wh)
    ctx.beginPath()
    ctx.moveTo(wx + ww / 2, wy)
    ctx.lineTo(wx + ww / 2, wy + wh)
    ctx.moveTo(wx, wy + wh / 2)
    ctx.lineTo(wx + ww, wy + wh / 2)
    ctx.stroke()
  }

  ctx.restore()
}

/** Capilla lejana con una ventana apagada. */
function drawChapel(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const s = Math.min(w, h) * 0.085
  const x = w * 0.64
  const y = h * 0.86

  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#070409'
  ctx.fillRect(-s * 0.28, -s * 0.72, s * 0.56, s * 0.72)

  ctx.beginPath()
  ctx.moveTo(-s * 0.34, -s * 0.72)
  ctx.lineTo(0, -s * 1.3)
  ctx.lineTo(s * 0.34, -s * 0.72)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = '#070409'
  ctx.lineWidth = Math.max(1, s * 0.035)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -s * 1.46)
  ctx.lineTo(0, -s * 1.2)
  ctx.moveTo(-s * 0.08, -s * 1.38)
  ctx.lineTo(s * 0.08, -s * 1.38)
  ctx.stroke()

  // Ventana apagada: sin glow.
  ctx.fillStyle = 'rgba(92, 52, 36, 0.72)'
  ctx.fillRect(-s * 0.055, -s * 0.56, s * 0.11, s * 0.2)
  ctx.restore()
}

/** Colina cercana delante de las construcciones: les tapa la base y las ancla. */
function drawForegroundRidge(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const base = h * 0.852
  const amp = h * 0.016
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(0, base)
  const segments = 6
  for (let i = 0; i < segments; i += 1) {
    const x0 = (i / segments) * w
    const x1 = ((i + 1) / segments) * w
    const y0 = base - Math.sin(i * 1.3 + 0.9) * amp
    const y1 = base - Math.sin((i + 1) * 1.3 + 0.9) * amp
    ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - amp * 0.35, x1, y1)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = '#060309'
  ctx.fill()
}

/** Árbol muerto recursivo: tronco grueso y ramas que se afinan. */
function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seed: number,
  lean = 0
): void {
  const rng = mulberry32(seed)
  ctx.save()
  ctx.strokeStyle = '#040206'
  ctx.lineCap = 'round'

  const branch = (
    bx: number,
    by: number,
    angle: number,
    len: number,
    width: number,
    depth: number
  ): void => {
    const sway = (rng() - 0.5) * 0.35
    const ex = bx + Math.cos(angle + sway) * len
    const ey = by + Math.sin(angle + sway) * len
    const mx = (bx + ex) / 2 + (rng() - 0.5) * len * 0.12
    const my = (by + ey) / 2 + (rng() - 0.5) * len * 0.12
    ctx.lineWidth = Math.max(0.6, width)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.quadraticCurveTo(mx, my, ex, ey)
    ctx.stroke()
    if (depth <= 0) return
    const spread = 0.48 + rng() * 0.32
    branch(ex, ey, angle - spread, len * (0.58 + rng() * 0.16), width * 0.62, depth - 1)
    branch(ex, ey, angle + spread * 0.9, len * (0.54 + rng() * 0.2), width * 0.58, depth - 1)
    if (depth > 2 && rng() > 0.45) {
      branch(ex, ey, angle + (rng() - 0.5) * 0.5, len * 0.4, width * 0.42, depth - 2)
    }
  }

  branch(x, y, -Math.PI / 2 + lean, size * 0.4, size * 0.055, 5)
  ctx.restore()
}

/**
 * Mini cementerio lejano sobre la ladera: lápidas pequeñas, una cruz y un
 * panteón. Reemplaza las lápidas gigantes del primer plano, que quedaban
 * tapadas por la niebla y los paneles.
 */
function drawDistantGraveyard(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const rng = mulberry32(99)
  const unit = Math.min(w, h)
  const base = h * 0.802
  const left = w * 0.415
  const span = w * 0.155

  // Cerca baja de hierro.
  ctx.save()
  ctx.strokeStyle = 'rgba(9, 5, 12, 0.95)'
  ctx.lineWidth = Math.max(0.7, unit * 0.0018)
  for (let i = 0; i < 9; i += 1) {
    const x = left + (span * i) / 8
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.lineTo(x, base - unit * 0.03)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(left, base - unit * 0.019)
  ctx.lineTo(left + span, base - unit * 0.019)
  ctx.stroke()
  ctx.restore()

  // Panteón: el punto más alto del cementerio.
  const cryptX = left + span * 0.64
  const cryptY = base - unit * 0.004
  const cs = unit * 0.046
  ctx.save()
  ctx.translate(cryptX, cryptY)
  ctx.fillStyle = '#09050d'
  ctx.fillRect(-cs * 0.3, -cs * 0.55, cs * 0.6, cs * 0.55)
  ctx.beginPath()
  ctx.moveTo(-cs * 0.38, -cs * 0.55)
  ctx.lineTo(0, -cs * 0.92)
  ctx.lineTo(cs * 0.38, -cs * 0.55)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#040207'
  ctx.fillRect(-cs * 0.08, -cs * 0.27, cs * 0.16, cs * 0.27)
  ctx.restore()

  // Lápidas chicas y alguna cruz.
  for (let i = 0; i < 8; i += 1) {
    const x = left + span * (0.05 + i * 0.115) + (rng() - 0.5) * unit * 0.008
    const sw = unit * (0.008 + rng() * 0.006)
    const sh = sw * (1.2 + rng() * 0.85)
    const y = base - sh * 0.12 + (rng() - 0.5) * unit * 0.006
    const tilt = (rng() - 0.5) * 0.18
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tilt)
    ctx.fillStyle = '#050208'
    if (i % 4 === 2) {
      ctx.strokeStyle = 'rgba(7, 4, 10, 0.95)'
      ctx.lineWidth = Math.max(0.6, unit * 0.0015)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -sh)
      ctx.moveTo(-sw * 0.22, -sh * 0.74)
      ctx.lineTo(sw * 0.22, -sh * 0.74)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(-sw / 2, 0)
      ctx.lineTo(-sw / 2, -sh * 0.62)
      ctx.quadraticCurveTo(-sw / 2, -sh, 0, -sh)
      ctx.quadraticCurveTo(sw / 2, -sh, sw / 2, -sh * 0.62)
      ctx.lineTo(sw / 2, 0)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
}

/** Calabazas talladas con la cara encendida. */
function drawPumpkins(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const unit = Math.min(w, h)

  for (const pumpkin of PUMPKINS) {
    const s = unit * 0.034 * pumpkin.s
    const x = w * pumpkin.x
    const y = h * pumpkin.y

    ctx.save()
    ctx.translate(x, y)

    // Sombra proyectada en el suelo: le da peso a la calabaza.
    ctx.save()
    ctx.translate(0, s * 0.72)
    ctx.scale(1, 0.3)
    const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.35)
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)')
    shadow.addColorStop(0.55, 'rgba(0, 0, 0, 0.3)')
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    ctx.fillStyle = shadow
    ctx.fillRect(-s * 1.4, -s * 1.4, s * 2.8, s * 2.8)
    ctx.restore()

    // Cuerpo naranja: sin halo alrededor; la luz sale solo de la cara.
    const body = ctx.createLinearGradient(-s * 0.8, -s * 0.9, s * 0.8, s)
    body.addColorStop(0, '#f5a24e')
    body.addColorStop(0.45, '#dd6f2c')
    body.addColorStop(1, '#9e3c17')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.ellipse(0, 0, s, s * 0.78, 0, 0, TAU)
    ctx.fill()

    // Volumen: luz arriba a la izquierda, sombra abajo a la derecha.
    const shade = ctx.createRadialGradient(-s * 0.32, -s * 0.42, s * 0.06, 0, 0, s * 1.05)
    shade.addColorStop(0, 'rgba(255, 210, 140, 0.3)')
    shade.addColorStop(0.42, 'rgba(255, 150, 70, 0.02)')
    shade.addColorStop(1, 'rgba(40, 7, 0, 0.62)')
    ctx.fillStyle = shade
    ctx.beginPath()
    ctx.ellipse(0, 0, s, s * 0.78, 0, 0, TAU)
    ctx.fill()

    ctx.strokeStyle = 'rgba(92, 34, 10, 0.55)'
    ctx.lineWidth = Math.max(0.7, s * 0.05)
    for (const offset of [-0.45, 0, 0.45]) {
      ctx.beginPath()
      ctx.ellipse(offset * s, 0, s * 0.22, s * 0.74, 0, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
    }

    // Reflejo tenue en el lomo izquierdo.
    ctx.strokeStyle = 'rgba(255, 214, 150, 0.22)'
    ctx.lineWidth = Math.max(1, s * 0.04)
    ctx.beginPath()
    ctx.ellipse(-s * 0.4, -s * 0.04, s * 0.2, s * 0.54, 0, Math.PI * 0.62, Math.PI * 1.38)
    ctx.stroke()

    ctx.fillStyle = 'rgba(40, 10, 5, 0.38)'
    ctx.beginPath()
    ctx.ellipse(0, -s * 0.72, s * 0.19, s * 0.06, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#4f5f23'
    ctx.fillRect(-s * 0.08, -s * 1.02, s * 0.16, s * 0.28)

    // Solo los ojos y la boca emiten luz.
    ctx.save()
    ctx.shadowColor = 'rgba(255, 170, 66, 0.95)'
    ctx.shadowBlur = Math.max(3, s * 0.6)
    ctx.fillStyle = '#ffd98a'
    ctx.beginPath()
    ctx.moveTo(-s * 0.46, -s * 0.18)
    ctx.lineTo(-s * 0.2, -s * 0.32)
    ctx.lineTo(-s * 0.17, -s * 0.04)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(s * 0.46, -s * 0.18)
    ctx.lineTo(s * 0.2, -s * 0.32)
    ctx.lineTo(s * 0.17, -s * 0.04)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-s * 0.36, s * 0.2)
    ctx.lineTo(-s * 0.18, s * 0.1)
    ctx.lineTo(0, s * 0.22)
    ctx.lineTo(s * 0.18, s * 0.1)
    ctx.lineTo(s * 0.36, s * 0.2)
    ctx.lineTo(s * 0.24, s * 0.38)
    ctx.lineTo(0, s * 0.3)
    ctx.lineTo(-s * 0.24, s * 0.38)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.restore()
  }
}

/** Pinta la capa estática en un canvas aparte: sólo se repinta al redimensionar. */
function prepareLayer(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  dpr: number
): CanvasRenderingContext2D | null {
  const pw = Math.max(1, Math.round(w * dpr))
  const ph = Math.max(1, Math.round(h * dpr))
  if (canvas.width !== pw) canvas.width = pw
  if (canvas.height !== ph) canvas.height = ph
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  return ctx
}

/** Cielo + luna. Las nubes se dibujan encima de esta capa. */
function paintSky(canvas: HTMLCanvasElement, w: number, h: number, dpr: number): void {
  const ctx = prepareLayer(canvas, w, h, dpr)
  if (!ctx) return

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#04050b')
  sky.addColorStop(0.45, '#0a0611')
  sky.addColorStop(0.72, '#1b0916')
  sky.addColorStop(0.88, '#2b0c14')
  sky.addColorStop(1, '#090407')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  const nebula = ctx.createRadialGradient(w * 0.22, h * 0.18, 0, w * 0.22, h * 0.18, w * 0.52)
  nebula.addColorStop(0, 'rgba(58, 36, 92, 0.18)')
  nebula.addColorStop(0.55, 'rgba(34, 20, 58, 0.07)')
  nebula.addColorStop(1, 'rgba(10, 4, 16, 0)')
  ctx.fillStyle = nebula
  ctx.fillRect(0, 0, w, h)

  const horizon = ctx.createRadialGradient(w * 0.5, h * 0.84, 0, w * 0.5, h * 0.84, w * 0.64)
  horizon.addColorStop(0, 'rgba(154, 42, 34, 0.2)')
  horizon.addColorStop(0.55, 'rgba(90, 22, 26, 0.07)')
  horizon.addColorStop(1, 'rgba(20, 5, 10, 0)')
  ctx.fillStyle = horizon
  // Pantalla completa: recortar el gradiente deja una costura horizontal.
  ctx.fillRect(0, 0, w, h)

  drawMoon(ctx, w, h)

  const vignette = ctx.createRadialGradient(
    w * 0.5,
    h * 0.45,
    Math.min(w, h) * 0.2,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.78
  )
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.46)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

/**
 * Todo el paisaje sólido: cerros, cementerio, capilla, casa, árboles y
 * calabaza. Es una capa con el cielo TRANSPARENTE, así las nubes quedan
 * detrás de los árboles y las montañas.
 */
function paintForeground(canvas: HTMLCanvasElement, w: number, h: number, dpr: number): void {
  const ctx = prepareLayer(canvas, w, h, dpr)
  if (!ctx) return

  drawHills(ctx, w, h)
  drawDistantGraveyard(ctx, w, h)
  drawChapel(ctx, w, h)
  drawHouse(ctx, w, h)

  const unit = Math.min(w, h)
  drawTree(ctx, w * 0.055, h * 0.895, unit * 0.32, 11, 0.06)
  drawTree(ctx, w * 0.31, h * 0.875, unit * 0.24, 29, -0.08)
  drawTree(ctx, w * 0.91, h * 0.965, unit * 0.82, 73, -0.24)

  // La colina cercana tapa el pie de los árboles y las construcciones: nacen
  // detrás de la montaña en vez de quedar flotando sobre ella.
  drawForegroundRidge(ctx, w, h)
  drawPumpkins(ctx, w, h)
}

/** Sprite radial reutilizable: evita crear gradientes en cada frame. */
function radialSprite(
  size: number,
  stops: Array<[number, string]>
): HTMLCanvasElement {
  const sprite = document.createElement('canvas')
  sprite.width = size
  sprite.height = size
  const ctx = sprite.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    for (const [at, color] of stops) gradient.addColorStop(at, color)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return sprite
}

/**
 * Textura de niebla repetible en horizontal: las bolas que cruzan un borde se
 * dibujan también al otro lado, así el tile no tiene costura y puede desplazarse
 * a la derecha para siempre sin que aparezca un hueco.
 */
function makeFogTexture(seed: number): HTMLCanvasElement {
  const w = 512
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const rng = mulberry32(seed)

  for (let i = 0; i < 24; i += 1) {
    const x = rng() * w
    const y = h * (0.3 + rng() * 0.38)
    const r = h * (0.16 + rng() * 0.24)
    const a = 0.1 + rng() * 0.09
    for (const dx of [-w, 0, w]) {
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r)
      g.addColorStop(0, `rgba(128, 138, 162, ${a})`)
      g.addColorStop(0.55, `rgba(82, 76, 102, ${a * 0.55})`)
      g.addColorStop(1, 'rgba(30, 22, 38, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x + dx - r, y - r, r * 2, r * 2)
    }
  }

  // Base muy tenue: garantiza una bruma continua entre las bolas.
  ctx.fillStyle = 'rgba(96, 106, 132, 0.05)'
  ctx.fillRect(0, 0, w, h)

  // Funde arriba y abajo para que la capa no tenga un borde duro.
  ctx.globalCompositeOperation = 'destination-in'
  const fade = ctx.createLinearGradient(0, 0, 0, h)
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  fade.addColorStop(0.28, 'rgba(0, 0, 0, 1)')
  fade.addColorStop(0.78, 'rgba(0, 0, 0, 1)')
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  return canvas
}

/**
 * Manto de nubes repetible: puffs alargados, no bolitas sueltas. Se dibuja
 * antes del foreground, así los árboles y las montañas siempre quedan delante.
 */
function makeCloudTexture(seed: number): HTMLCanvasElement {
  const w = 1024
  const h = 320
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const rng = mulberry32(seed)

  for (let i = 0; i < 18; i += 1) {
    const x = rng() * w
    const y = h * (0.22 + rng() * 0.56)
    const rw = h * (0.22 + rng() * 0.38)
    const rh = h * (0.09 + rng() * 0.14)
    const a = 0.16 + rng() * 0.12
    for (const dx of [-w, 0, w]) {
      ctx.save()
      ctx.translate(x + dx, y)
      ctx.scale(1, rh / rw)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rw)
      g.addColorStop(0, `rgba(86, 76, 108, ${a})`)
      g.addColorStop(0.55, `rgba(48, 40, 66, ${a * 0.55})`)
      g.addColorStop(1, 'rgba(18, 14, 30, 0)')
      ctx.fillStyle = g
      ctx.fillRect(-rw, -rw, rw * 2, rw * 2)
      ctx.restore()
    }
  }

  ctx.globalCompositeOperation = 'destination-in'
  const fade = ctx.createLinearGradient(0, 0, 0, h)
  fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  fade.addColorStop(0.08, 'rgba(0, 0, 0, 1)')
  fade.addColorStop(0.92, 'rgba(0, 0, 0, 1)')
  fade.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
  return canvas
}

/** Murciélago de silueta con alas que baten. */
let batPath: Path2D | null = null

function getBatPath(): Path2D {
  if (!batPath) batPath = new Path2D(BAT_PATH)
  return batPath
}

/**
 * Mismo murciélago que el evento: silueta compartida y el mismo recorte de
 * alas que usa el motor de partículas, para que el cielo y los murciélagos
 * del timeline se vean idénticos.
 */
function drawBat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  flap: number,
  dir: number
): void {
  const path = getBatPath()
  const [vbW, vbH] = BAT_VIEWBOX
  const [bodyLeft, bodyRight] = BAT_WING_CLIP
  const [ax, ay] = BAT_WING_ANCHOR
  const phase = Math.max(-1, Math.min(1, flap))
  const wingAngle = phase * 22
  const wingScale = 1 - 0.38 * (0.5 + 0.5 * phase)
  const rad = (wingAngle * Math.PI) / 180
  const s = size / vbH

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, 1)
  ctx.scale(s, s)
  ctx.translate(-vbW / 2, -vbH / 2)
  ctx.fillStyle = 'rgba(3, 2, 6, 0.92)'

  const paintWing = (left: boolean): void => {
    ctx.save()
    ctx.beginPath()
    if (left) ctx.rect(-vbW, -vbH, bodyLeft + vbW, vbH * 3)
    else ctx.rect(bodyRight, -vbH, vbW, vbH * 3)
    ctx.clip()
    const px = left ? ax : vbW - ax
    ctx.translate(px, ay)
    ctx.rotate(left ? rad : -rad)
    ctx.scale(wingScale, 1)
    ctx.translate(-px, -ay)
    ctx.fill(path)
    ctx.restore()
  }

  // El path completo incluye las alas; si se dibuja entero queda una silueta
  // estática debajo de las alas que se mueven (el "murciélago doble"). El
  // cuerpo es solo la franja central entre los dos cortes.
  const paintBody = (): void => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(bodyLeft, -vbH, bodyRight - bodyLeft, vbH * 3)
    ctx.clip()
    ctx.fill(path)
    ctx.restore()
  }

  const near = phase >= 0
  if (near) {
    paintBody()
    paintWing(true)
    paintWing(false)
  } else {
    paintWing(true)
    paintWing(false)
    paintBody()
  }
  ctx.restore()
}

export default function NightSky({ on }: OverlayProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const rng = mulberry32(0x5eed)
    const starTints = ['#ffe7c8', '#f6dbef', '#d5e2ff', '#ffc9b4']
    const stars: Star[] = Array.from({ length: 150 }, () => {
      const bright = rng() > 0.87
      return {
        x: rng(),
        y: rng() * 0.66,
        r: bright ? 1.3 + rng() * 1.2 : 0.35 + rng() * 0.9,
        phase: rng() * TAU,
        speed: 0.3 + rng() * 0.9,
        tint: starTints[Math.floor(rng() * starTints.length)],
        bright
      }
    })

    const bats: Bat[] = Array.from({ length: 8 }, () => ({
      x: rng(),
      y: 0.12 + rng() * 0.42,
      scale: 0.018 + rng() * 0.03,
      speed: 0.004 + rng() * 0.009,
      phase: rng() * TAU,
      flap: 5 + rng() * 4,
      drift: 0.14 + rng() * 0.26,
      dir: rng() > 0.5 ? 1 : -1
    }))

    const embers: Ember[] = Array.from({ length: 36 }, () => ({
      x: rng(),
      y: 0.52 + rng() * 0.43,
      r: 0.8 + rng() * 2.2,
      speed: 0.012 + rng() * 0.035,
      phase: rng() * TAU,
      alpha: 0.22 + rng() * 0.5
    }))

    const rain: RainDrop[] = Array.from({ length: 90 }, () => ({
      x: rng(),
      y: rng(),
      len: 8 + rng() * 18,
      speed: 0.35 + rng() * 0.45,
      alpha: 0.04 + rng() * 0.09
    }))

    const cloudTextures = [makeCloudTexture(0x51a3), makeCloudTexture(0x77c1)]
    const cloudLayers = [
      {
        texture: cloudTextures[0],
        y: 0.02,
        height: 0.34,
        scale: 0.95,
        alpha: 0.8,
        speed: 0.006,
        phase: 0
      },
      {
        texture: cloudTextures[1],
        y: 0.18,
        height: 0.36,
        scale: 1.15,
        alpha: 0.65,
        speed: 0.009,
        phase: 0.4
      }
    ]

    const backdrop = document.createElement('canvas')
    const foreground = document.createElement('canvas')
    const soft = document.createElement('canvas')
    const softCtx = soft.getContext('2d')
    const emberSprite = radialSprite(32, [
      [0, 'rgba(255, 226, 158, 1)'],
      [0.25, 'rgba(255, 150, 60, 0.9)'],
      [1, 'rgba(255, 80, 20, 0)']
    ])
    const fogTextures = [makeFogTexture(0x1a2b), makeFogTexture(0x3c4d)]
    const fogLayers = [
      {
        texture: fogTextures[0],
        y: 0.775,
        height: 0.23,
        scale: 0.44,
        alpha: 0.4,
        speed: 0.018,
        phase: 0
      },
      {
        texture: fogTextures[1],
        y: 0.86,
        height: 0.2,
        scale: 0.52,
        alpha: 0.48,
        speed: 0.028,
        phase: 0.37
      },
      {
        texture: fogTextures[0],
        y: 0.93,
        height: 0.16,
        scale: 0.6,
        alpha: 0.36,
        speed: 0.04,
        phase: 0.71
      }
    ]

    let width = 1
    let height = 1
    let dpr = 1
    let raf = 0
    let last = 0
    let disposed = false
    let visible = !document.hidden
    let flashAt = -1
    let meteor: Meteor | null = null
    let meteorTimer = 3 + rng() * 6

    const resize = (): void => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, window.innerWidth)
      height = Math.max(1, window.innerHeight)
      const pw = Math.max(1, Math.round(width * dpr))
      const ph = Math.max(1, Math.round(height * dpr))
      if (canvas.width !== pw) canvas.width = pw
      if (canvas.height !== ph) canvas.height = ph
      soft.width = Math.max(1, Math.round(width / 2))
      soft.height = Math.max(1, Math.round(height / 2))
      paintSky(backdrop, width, height, dpr)
      paintForeground(foreground, width, height, dpr)
    }

    const offStrike = on('strike', () => {
      flashAt = performance.now()
    })

    const draw = (now: number): void => {
      const t = now / 1000
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016
      last = now

      let flash = 0
      if (flashAt >= 0) {
        const age = (now - flashAt) / 1000
        flash = Math.max(0, Math.exp(-age * 5.5) * (0.72 + 0.28 * Math.sin(age * 50)))
        if (age > 2.4) flashAt = -1
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.drawImage(backdrop, 0, 0, width, height)

      for (const star of stars) {
        const twinkle = reduced
          ? 0.62
          : 0.42 + 0.58 * Math.abs(Math.sin(t * star.speed + star.phase))
        ctx.globalAlpha = star.bright ? Math.min(1, twinkle * 1.25) : twinkle * 0.8
        ctx.fillStyle = star.tint
        const sx = star.x * width
        const sy = star.y * height
        ctx.beginPath()
        ctx.arc(sx, sy, star.r, 0, TAU)
        ctx.fill()
        if (star.bright) {
          ctx.globalAlpha *= 0.35
          const len = star.r * 4
          ctx.fillRect(sx - len, sy - 0.5, len * 2, 1)
          ctx.fillRect(sx - 0.5, sy - len, 1, len * 2)
        }
      }
      ctx.globalAlpha = 1

      // ── Nubes: cielo detrás del paisaje ────────────────────────────────
      if (softCtx) {
        softCtx.setTransform(1, 0, 0, 1, 0, 0)
        softCtx.clearRect(0, 0, soft.width, soft.height)
        softCtx.setTransform(soft.width / width, 0, 0, soft.height / height, 0, 0)
      }
      const skyLayer = softCtx ?? ctx
      for (const cloud of cloudLayers) {
        const tileW = width * cloud.scale
        const tileH = height * cloud.height
        const offset = (t * cloud.speed * tileW + cloud.phase * tileW) % tileW
        skyLayer.globalAlpha = Math.min(1, cloud.alpha * (1 + flash * 0.8))
        for (let x = offset - tileW; x < width; x += tileW) {
          skyLayer.drawImage(cloud.texture, x, cloud.y * height, tileW, tileH)
        }
      }
      skyLayer.globalAlpha = 1
      if (softCtx) ctx.drawImage(soft, 0, 0, width, height)

      if (!reduced) {
        meteorTimer -= dt
        if (!meteor && meteorTimer <= 0) {
          meteor = {
            x: width * (0.2 + rng() * 0.6),
            y: height * (0.08 + rng() * 0.2),
            vx: width * (0.22 + rng() * 0.12),
            vy: height * (0.1 + rng() * 0.06),
            life: 0.9,
            max: 0.9
          }
          meteorTimer = 8 + rng() * 14
        }
        if (meteor) {
          meteor.x += meteor.vx * dt
          meteor.y += meteor.vy * dt
          meteor.life -= dt
          if (meteor.life <= 0) {
            meteor = null
          } else {
            const alpha = Math.max(0, meteor.life / meteor.max)
            const tx = meteor.x - meteor.vx * 0.08
            const ty = meteor.y - meteor.vy * 0.08
            const tail = ctx.createLinearGradient(meteor.x, meteor.y, tx, ty)
            tail.addColorStop(0, `rgba(255, 236, 190, ${alpha})`)
            tail.addColorStop(1, 'rgba(255, 120, 90, 0)')
            ctx.strokeStyle = tail
            ctx.lineWidth = 1.6
            ctx.beginPath()
            ctx.moveTo(meteor.x, meteor.y)
            ctx.lineTo(tx, ty)
            ctx.stroke()
          }
        }
      }

      for (const bat of bats) {
        const bx = (((bat.x + t * bat.speed * bat.dir) % 1.3) + 1.3) % 1.3 - 0.15
        const by = bat.y + Math.sin(t * bat.drift + bat.phase) * 0.018
        drawBat(
          ctx,
          bx * width,
          by * height,
          Math.min(width, height) * bat.scale,
          Math.sin(t * bat.flap + bat.phase),
          bat.dir
        )
      }

      // ── Paisaje sólido: SIEMPRE delante de las nubes ───────────────────
      ctx.drawImage(foreground, 0, 0, width, height)

      // ── Suelo: lluvia, niebla y brasas ─────────────────────────────────
      if (softCtx) {
        softCtx.setTransform(1, 0, 0, 1, 0, 0)
        softCtx.clearRect(0, 0, soft.width, soft.height)
        softCtx.setTransform(soft.width / width, 0, 0, soft.height / height, 0, 0)
      }
      const groundLayer = softCtx ?? ctx

      groundLayer.strokeStyle = 'rgba(168, 184, 216, 0.075)'
      groundLayer.lineWidth = 1
      groundLayer.beginPath()
      for (const drop of rain) {
        if (!reduced) {
          drop.y += drop.speed * dt
          drop.x -= drop.speed * 0.14 * dt
          if (drop.y > 1.05) {
            drop.y = -0.05
            drop.x = rng()
          }
          if (drop.x < -0.05) drop.x = 1.05
        }
        groundLayer.moveTo(drop.x * width, drop.y * height)
        groundLayer.lineTo(drop.x * width - 2, drop.y * height + drop.len)
      }
      groundLayer.stroke()

      const ground = groundLayer.createLinearGradient(0, height * 0.8, 0, height)
      ground.addColorStop(0, 'rgba(86, 96, 120, 0)')
      ground.addColorStop(0.65, 'rgba(86, 96, 120, 0.06)')
      ground.addColorStop(1, 'rgba(86, 96, 120, 0.14)')
      groundLayer.fillStyle = ground
      groundLayer.fillRect(0, height * 0.8, width, height * 0.2)

      // Niebla continua: se repite en horizontal y avanza siempre a la derecha.
      for (const fogLayer of fogLayers) {
        const tileW = Math.max(280, width * fogLayer.scale)
        const tileH = height * fogLayer.height
        const offset = (t * fogLayer.speed * tileW + fogLayer.phase * tileW) % tileW
        groundLayer.globalAlpha = fogLayer.alpha
        for (let x = offset - tileW; x < width; x += tileW) {
          groundLayer.drawImage(fogLayer.texture, x, fogLayer.y * height, tileW, tileH)
        }
      }
      groundLayer.globalAlpha = 1

      groundLayer.save()
      groundLayer.globalCompositeOperation = 'lighter'
      for (const ember of embers) {
        if (!reduced) {
          ember.y -= ember.speed * dt
          ember.x += Math.sin(t * 0.6 + ember.phase) * 0.00035
          if (ember.y < 0.42) {
            ember.y = 0.92 + rng() * 0.08
            ember.x = 0.08 + rng() * 0.84
          }
        }
        const alpha = ember.alpha * (0.45 + 0.55 * Math.abs(Math.sin(t * 0.8 + ember.phase)))
        groundLayer.globalAlpha = alpha
        const ex = ember.x * width
        const ey = ember.y * height
        const size = ember.r * 4
        groundLayer.drawImage(emberSprite, ex - size / 2, ey - size / 2, size, size)
      }
      groundLayer.globalAlpha = 1
      groundLayer.restore()

      if (softCtx) ctx.drawImage(soft, 0, 0, width, height)

      if (flash > 0.01) {
        ctx.save()
        ctx.globalCompositeOperation = 'screen'
        ctx.fillStyle = `rgba(170, 190, 230, ${flash * 0.16})`
        ctx.fillRect(0, 0, width, height)
        ctx.restore()
      }
    }

    const frame = (now: number): void => {
      raf = 0
      if (disposed || !visible) return
      draw(now)
      if (!reduced) raf = requestAnimationFrame(frame)
    }

    const wake = (): void => {
      if (raf || disposed || !visible || reduced) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const onResize = (): void => {
      resize()
      last = 0
      if (reduced) draw(performance.now())
      else wake()
    }

    const onVisibility = (): void => {
      visible = !document.hidden
      if (visible) {
        last = 0
        wake()
      }
    }

    resize()
    last = 0
    draw(performance.now())
    if (!reduced) wake()
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      disposed = true
      offStrike()
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [on])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1
      }}
      aria-hidden="true"
    />
  )
}
