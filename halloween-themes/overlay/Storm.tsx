// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0
// Licencia completa en LICENSE (Apache License 2.0).

/**
 * Storm — background del pack de Halloween: cielo + rayo.
 *
 * Compone los dos componentes en UNA contribución de capa `background`, para que
 * la tormenta viva DETRÁS de la app (no encima de los controles). El evento le
 * manda `strike` por `on` y el rayo cae en el ancla; el cielo sólo dibuja.
 */

import type { JSX } from 'react'
import Lightning from './Lightning'
import NightSky from './NightSky'

interface OverlayProps {
  on: (name: string, handler: (payload: unknown) => void) => () => void
  event?: { id: string; name: string }
  props?: Record<string, unknown>
}

export default function Storm({ on }: OverlayProps): JSX.Element {
  return (
    <>
      <NightSky on={on} />
      <Lightning on={on} />
    </>
  )
}
