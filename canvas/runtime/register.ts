// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0

/**
 * Registro en el IDE: comandos de la paleta y el handler del tool de IA.
 *
 * Este módulo corre cuando el loader importa el bundle (lo importa el panel, que
 * es el módulo que el manifest referencia). Registrar acá —y no más tarde, en un
 * `setTimeout`— es el contrato: la app atribuye lo registrado a la extensión que
 * está importando en ese momento.
 *
 * Los dos caminos que expone la app:
 *  - `window.scrakk.commands.register` → aparece en la barra de comandos.
 *  - `window.scrakk.tools.register`    → atiende el `command` que el manifest
 *    declara en `contributes.tools` (esta extensión es declarativa: no tiene
 *    Extension Host donde correr código).
 */

import { openPanelTab } from '@features/layout'
import { board } from '../panels/board'
import { exampleSketch } from '../panels/examples'

const PANEL_ID = 'canvas-board'

interface RuntimeBridge {
  commands?: {
    register: (input: {
      id: string
      title: string
      category?: string
      run: () => void
    }) => unknown
  }
  tools?: {
    register: (
      command: string,
      run: (args: Record<string, unknown>) => unknown
    ) => unknown
  }
}

declare global {
  interface Window {
    scrakk?: RuntimeBridge
  }
}

const bridge: RuntimeBridge | undefined = typeof window === 'undefined' ? undefined : window.scrakk

/** Abre el panel en el centro (el mismo panel del botón de la barra lateral). */
function showBoard(): void {
  openPanelTab('center', PANEL_ID)
}

/** Solo la PRIMERA vez: no queremos abrirle una tab al usuario en cada dibujo. */
let opened = false

function showBoardOnce(): void {
  if (opened) return
  opened = true
  showBoard()
}

bridge?.commands?.register({
  id: 'open',
  title: 'Canvas: abrir el lienzo',
  category: 'Canvas',
  run: showBoard
})

bridge?.commands?.register({
  id: 'clear',
  title: 'Canvas: vaciar el lienzo',
  category: 'Canvas',
  run: () => board.clear()
})

bridge?.commands?.register({
  id: 'example',
  title: 'Canvas: dibujo de ejemplo',
  category: 'Canvas',
  run: () => {
    board.clear()
    board.add(exampleSketch())
    showBoard()
  }
})

bridge?.tools?.register('canvas.draw', (args) => {
  const clear = args?.clear === true
  const drawn = board.draw(args?.shapes, clear)
  if (drawn > 0) showBoardOnce()

  const total = board.count()
  const note = typeof args?.note === 'string' ? args.note.trim() : ''
  const summary =
    drawn > 0
      ? `Dibujé ${drawn} figura${drawn === 1 ? '' : 's'} en el lienzo (ahora hay ${total}).`
      : clear
        ? 'Vacié el lienzo.'
        : 'No había figuras válidas para dibujar.'

  return note ? `${summary} ${note}` : summary
})
