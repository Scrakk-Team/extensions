// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0

/**
 * Panel «Canvas»: el lienzo.
 *
 * Es un `<canvas>` 2D y nada más: pinta lo que hay en `board` (el estado que
 * comparte con el tool de IA) y captura el mouse para dibujar a mano. Todo el
 * modelo vive en `board.ts` y el pintado en `paint.ts`, así que este archivo es
 * solo el puente con React y el DOM.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { HeaderActionButton, usePanelTitle } from '@features/layout'
import { INK_COLORS, STROKE_WIDTH, board, normalizePoint, type Point } from './board'
import { paintBoard } from './paint'
// El registro de comandos/tools del IDE tiene que correr cuando el loader
// importa el bundle: el panel es el módulo que el manifest referencia.
import '../runtime/register'

/** Papel del lienzo: el panel mantiene su identidad de plano con cualquier tema. */
const PAPER = '#0b1a2b'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export default function Canvas() {
  const { setTitle, setActions } = usePanelTitle()
  // El tercer argumento (snapshot de servidor) es lo que permite renderizar el
  // panel fuera del navegador — sin él, React no sabe qué pintar y tira.
  const shapes = useSyncExternalStore(board.subscribe, board.getShapes, board.getShapes)

  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [ink, setInk] = useState(0)
  const [drawing, setDrawing] = useState(false)

  useEffect(() => {
    setTitle('Canvas')
  }, [setTitle])

  useEffect(() => {
    setActions(() => (
      <>
        <HeaderActionButton
          id="canvas-board.ink"
          label="Cambiar la tinta"
          icon="pencil"
          shape="rounded"
          onClick={() => setInk((value) => (value + 1) % INK_COLORS.length)}
        />
        <HeaderActionButton
          id="canvas-board.clear"
          label="Vaciar el lienzo"
          icon="trash"
          shape="rounded"
          onClick={() => board.clear()}
        />
      </>
    ))
    return () => setActions(null)
  }, [setActions])

  // El canvas se repinta cuando cambia el panel, así que hay que saber su tamaño.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = (): void => setSize({ width: host.clientWidth, height: host.clientHeight })
    measure()
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(measure)
      observer.observe(host)
      return () => observer.disconnect()
    }
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || size.width < 1 || size.height < 1) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(size.width * ratio))
    canvas.height = Math.max(1, Math.round(size.height * ratio))
    const context = canvas.getContext('2d')
    if (!context) return
    // Se pinta en píxeles CSS y el contexto escala por DPR (nada de bordes borrosos).
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    paintBoard(context, shapes, { width: size.width, height: size.height, paper: PAPER })
  }, [shapes, size])

  const pointOf = useCallback((event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return normalizePoint(
      (event.clientX - rect.left) / Math.max(1, rect.width),
      (event.clientY - rect.top) / Math.max(1, rect.height)
    )
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      drawingRef.current = true
      setDrawing(true)
      board.beginStroke(pointOf(event), INK_COLORS[ink], STROKE_WIDTH)
    },
    [ink, pointOf]
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (drawingRef.current) board.extendStroke(pointOf(event))
    },
    [pointOf]
  )

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    setDrawing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  const lastBy = board.lastBy()
  const status =
    shapes.length === 0
      ? 'lienzo vacío'
      : `${shapes.length} figura${shapes.length === 1 ? '' : 's'}${lastBy === 'ai' ? ' · dibujó la IA' : ''}`

  return (
    <div
      ref={hostRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: PAPER
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: drawing ? 'grabbing' : 'crosshair',
          touchAction: 'none'
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {shapes.length === 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            pointerEvents: 'none',
            textAlign: 'center',
            color: '#8fb3d1',
            font: `13px/1.7 ${MONO}`
          }}
        >
          <div>
            <div>Dibujá con el mouse.</div>
            <div>O pedile a la IA: «dibujá una casa en el lienzo».</div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 10,
          bottom: 8,
          pointerEvents: 'none',
          color: '#5b7f9e',
          font: `11px ${MONO}`
        }}
      >
        {status}
      </div>
    </div>
  )
}
