// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0

/**
 * Un dibujo de ejemplo.
 *
 * Cumple dos funciones: es el comando «Canvas: dibujo de ejemplo» (para ver el
 * lienzo andando sin depender de la IA) y es la REFERENCIA del formato de
 * figuras — exactamente lo mismo que puede mandar el tool `canvas_draw`.
 */

import type { Shape } from './board'

const INK = '#e6f1ff'
const SUN = '#f7c948'
const SKY = '#7dd3fc'
const GROUND = '#4a7fa8'

export const EXAMPLE_NOTE = 'Una casa con sol y la palabra CANVAS.'

export function exampleSketch(): Shape[] {
  return [
    {
      kind: 'text',
      points: [[0.1, 0.14]],
      text: 'CANVAS',
      color: SKY,
      width: 3,
      by: 'ai'
    },
    {
      kind: 'circle',
      points: [
        [0.8, 0.22],
        [0.87, 0.22]
      ],
      color: SUN,
      width: 2,
      fill: true,
      by: 'ai'
    },
    {
      kind: 'line',
      points: [
        [0.06, 0.82],
        [0.94, 0.82]
      ],
      color: GROUND,
      width: 2,
      by: 'ai'
    },
    {
      kind: 'rect',
      points: [
        [0.28, 0.5],
        [0.66, 0.82]
      ],
      color: INK,
      width: 2.5,
      by: 'ai'
    },
    {
      kind: 'stroke',
      points: [
        [0.24, 0.5],
        [0.47, 0.3],
        [0.7, 0.5]
      ],
      color: SUN,
      width: 3,
      by: 'ai'
    },
    {
      kind: 'rect',
      points: [
        [0.43, 0.62],
        [0.51, 0.82]
      ],
      color: SKY,
      width: 2,
      by: 'ai'
    },
    {
      kind: 'rect',
      points: [
        [0.56, 0.36],
        [0.62, 0.46]
      ],
      color: GROUND,
      width: 2,
      by: 'ai'
    }
  ]
}
