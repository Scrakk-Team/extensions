// Copyright 2026 Scrakk Studio
// SPDX-License-Identifier: Apache-2.0

/**
 * Icono del botón de la barra de actividad.
 *
 * Es un MÓDULO del paquete (no un id de productIcons): el contrato es un
 * componente `{ size?: number }`. `currentColor` para que siga al tema.
 */

export default function CanvasIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 16.5 8.5 11l4 4 3.5-3 5 5" />
      <circle cx="9" cy="7.75" r="1.6" />
    </svg>
  )
}
