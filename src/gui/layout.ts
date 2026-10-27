// The app's Windows titlebar overlay height, from packages/desktop/src/main/windows/defaults.ts.
export const TITLEBAR = 44
// Three native Windows caption buttons, 46px each.
export const CAPTION = 138

/** The monitor case around the tube, in CSS pixels. The web has no window to dress, so no case. */
export function frame(desktop: boolean, zoom: number) {
  if (!desktop) return { top: 0, side: 0, bottom: 0 }
  return { top: Math.max(TITLEBAR, TITLEBAR * zoom) / zoom, side: 18, bottom: 40 }
}

/** k in uv' = uv + k·uv·(other axis)²; 0.12 bends a corner in by 6% of the tube. */
export function bend(curvature: number) {
  return (curvature / 100) * 0.12
}
