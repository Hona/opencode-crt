import { createMemo, createSignal, onCleanup, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { createLatest, usePlugin } from "@opencode/plugin/gui"
import { Tube } from "./contract"
import type { definition, Tint } from "./definition"
import { Entity } from "./entity"
import { bend, CAPTION, frame } from "./layout"

export const FILTER_ID = "opencode-crt-tube"

const MAP_SIZE = 512

// Luminance weights (Rec. 709) times the phosphor's emission colour.
const phosphor: Record<Tint, readonly [number, number, number] | undefined> = {
  none: undefined,
  green: [0.2, 1, 0.35],
  amber: [1, 0.68, 0.12],
}

/**
 * The monitor. `<body>` becomes the tube: tube.css insets it into the case and runs it through the SVG filter here,
 * so every pixel of the app is curved and smeared in one pass. The static glass (scanlines, mask, vignette, bezel)
 * is portalled into `<body>` so the curve bends it with the content. The case and the animated beam layers stay
 * outside `<body>`: the case is flat plastic, and the beam layers only animate opacity and transform on the
 * compositor, so the expensive filter does not run again every frame.
 */
export function Screen(props: { readonly summons: () => number }) {
  const ctx = usePlugin<typeof definition>()
  const prefs = () => ctx.stores.prefs.value
  const desktop = ctx.app.platform === "desktop"
  const windows = ctx.desktop?.os === "windows"
  const zoom = () => ctx.desktop?.zoom() ?? 1
  const [viewport, setViewport] = createSignal({ width: window.innerWidth, height: window.innerHeight })
  const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })

  window.addEventListener("resize", resize)
  onCleanup(() => window.removeEventListener("resize", resize))

  const tube = createMemo(
    () => {
      const edge = frame(desktop, zoom())
      return {
        x: edge.side,
        y: edge.top,
        width: Math.max(1, viewport().width - edge.side * 2),
        height: Math.max(1, viewport().height - edge.top - edge.bottom),
      }
    },
    undefined,
    { equals: (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height },
  )
  const longest = () => Math.max(tube().width, tube().height)
  // Only the aspect ratio shapes the map; rounding keeps a window drag from redrawing it every pixel.
  const aspect = createMemo(() => Math.round((tube().width / tube().height) * 50) / 50)
  const map = createMemo(() => barrelMap(aspect()))
  const shift = () => (prefs().aberration / 100) * 3
  const glow = () => (prefs().bloom / 100) * 0.6

  // Main takes the pointer over the tube and hands it to the page where the curved glass shows it.
  if (desktop) {
    const client = ctx.main(Tube(ctx.id))
    createLatest(
      () => ({ enabled: prefs().enabled, bend: bend(prefs().curvature), ...tube() }),
      (shape, signal) => client.set(shape, { signal }),
    )
    onCleanup(() => void client.set({ enabled: false, x: 0, y: 0, width: 0, height: 0, bend: 0 }).catch(() => undefined))
  }

  return (
    <Show when={prefs().enabled}>
      <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", width: "0", height: "0" }}>
        <filter
          id={FILTER_ID}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={tube().width}
          height={tube().height}
          color-interpolation-filters="sRGB"
        >
          {/* Convergence error: split the beams and miss red right, blue left. */}
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
          <feOffset dx={shift()} dy="0" result="red" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
            result="green"
          />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" />
          <feOffset dx={-shift()} dy="0" result="blue" />
          <feBlend in="red" in2="green" mode="screen" result="yellow" />
          <feBlend in="yellow" in2="blue" mode="screen" result="beams" />

          <feColorMatrix in="beams" type="matrix" values={tintMatrix(phosphor[prefs().tint])} result="phosphor" />

          {/* Bloom: add a blurred copy so bright text bleeds into the dark around it. */}
          <feGaussianBlur in="phosphor" stdDeviation="4" result="halo" />
          <feComposite in="phosphor" in2="halo" operator="arithmetic" k1="0" k2="1" k3={glow()} k4="0" result="lit" />

          {/* Barrel distortion: each pixel of the glass shows the flat page further out, so the edges bow and the
              corners fall off into black. main.ts inverts the same curve for the pointer. */}
          <feImage
            href={map()}
            x="0"
            y="0"
            width={tube().width}
            height={tube().height}
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="lit"
            in2="map"
            scale={bend(prefs().curvature) * longest()}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      <Portal mount={document.body}>
        <div
          class="opencode-crt-glass"
          style={{
            "--crt-scan": String((prefs().scanlines / 100) * 0.5),
            "--crt-mask": String((prefs().mask / 100) * 0.4),
          }}
        >
          <Entity summons={props.summons} />
          <div class="opencode-crt-scanlines" />
          <div class="opencode-crt-mask" />
          <div class="opencode-crt-vignette" />
          <div class="opencode-crt-bezel" />
        </div>
      </Portal>

      <Show when={desktop}>
        <div class="opencode-crt-case" aria-hidden="true">
          <div class="opencode-crt-case-top" />
          <div
            class="opencode-crt-recess"
            style={{
              left: `${tube().x - 6}px`,
              top: `${tube().y - 6}px`,
              width: `${tube().width + 12}px`,
              height: `${tube().height + 12}px`,
            }}
          />
          <div class="opencode-crt-badge">OPENCODE</div>
          <div class="opencode-crt-controls">
            <span class="opencode-crt-knob" />
            <span class="opencode-crt-knob" />
            <span class="opencode-crt-led" />
          </div>
          {/* The native caption buttons still take the clicks; the case only draws them. */}
          <Show when={windows}>
            <div
              class="opencode-crt-caption"
              style={{ width: `${CAPTION / Math.max(zoom(), 1)}px`, height: `${tube().y}px` }}
            >
              <span data-glyph="minimize" />
              <span data-glyph="maximize" />
              <span data-glyph="close" />
            </div>
          </Show>
        </div>
      </Show>

      <Show when={prefs().flicker}>
        <div
          class="opencode-crt-beam"
          style={{
            left: `${tube().x}px`,
            top: `${tube().y}px`,
            width: `${tube().width}px`,
            height: `${tube().height}px`,
          }}
        >
          <div class="opencode-crt-flicker" />
          <div class="opencode-crt-roll" />
        </div>
      </Show>
    </Show>
  )
}

function tintMatrix(color: readonly [number, number, number] | undefined) {
  if (!color) return "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"
  return [
    ...color.flatMap((channel) => [0.2126 * channel, 0.7152 * channel, 0.0722 * channel, 0, 0]),
    ...[0, 0, 0, 1, 0],
  ].join(" ")
}

/**
 * The displacement map of a curved tube, after the classic CRT shader: uv' = uv + k·uv·(other axis)², with uv in
 * [-1, 1]. feDisplacementMap moves each pixel by scale·(channel − 0.5), so with scale = k·longest side, red holds
 * 0.5 + ½·u·v²·(width / longest) and green 0.5 + ½·v·u²·(height / longest). Only the aspect ratio changes the map;
 * the curvature only changes `scale`.
 */
function barrelMap(aspect: number) {
  const canvas = document.createElement("canvas")
  canvas.width = MAP_SIZE
  canvas.height = MAP_SIZE
  const context = canvas.getContext("2d")
  if (!context) return ""
  const image = context.createImageData(MAP_SIZE, MAP_SIZE)
  const ax = aspect >= 1 ? 1 : aspect
  const ay = aspect >= 1 ? 1 / aspect : 1

  Array.from({ length: MAP_SIZE * MAP_SIZE }, (_, index) => {
    const u = ((index % MAP_SIZE) + 0.5) / (MAP_SIZE / 2) - 1
    const v = (Math.floor(index / MAP_SIZE) + 0.5) / (MAP_SIZE / 2) - 1
    image.data[index * 4] = Math.round((0.5 + 0.5 * u * v * v * ax) * 255)
    image.data[index * 4 + 1] = Math.round((0.5 + 0.5 * v * u * u * ay) * 255)
    image.data[index * 4 + 2] = 128
    image.data[index * 4 + 3] = 255
  })

  context.putImageData(image, 0, 0)
  return canvas.toDataURL("image/png")
}
