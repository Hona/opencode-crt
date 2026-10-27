import { createUniqueId, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { createKeyed, usePlugin } from "@opencode/plugin/gui"
import type { definition } from "./definition"

type Kind = "glimpse" | "watcher" | "peek" | "close"

interface Apparition {
  kind: Kind
  /** Horizontal position of the feet, 0–1 across the tube. */
  x: number
  /** Where the feet touch the floor, 0–1 down the tube. */
  floor: number
  /** Figure height as a share of the tube's. */
  height: number
  side: "left" | "right"
  opacity: number
  tilt: number
  duration: number
}

// Demo order for the summon command, so each summon shows another behaviour.
const ORDER: Kind[] = ["watcher", "peek", "glimpse", "close"]

const between = (min: number, max: number) => min + Math.random() * (max - min)

/**
 * Something that stands in the picture now and then. It lives inside the tube's glass, so the curve, the scanlines,
 * the mask and the phosphor tint all apply to it, as if the tube itself were showing it.
 *
 * - A glimpse is there for a few frames.
 * - A watcher stands far off, still, and slowly tilts its head. It is gone when the pointer comes near.
 * - A peek leans in from the edge of the tube, very slowly, then snaps away.
 * - Rarely, its face fills the tube for a fraction of a second.
 * - When the window gets focus back, it is sometimes standing right there.
 */
export function Entity(props: { readonly summons: () => number }) {
  const ctx = usePlugin<typeof definition>()
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const [state, setState] = createStore({
    apparition: undefined as Apparition | undefined,
    entered: false,
    tear: undefined as number | undefined,
    summoned: 0,
  })
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const later = (ms: number, fn: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      fn()
    }, ms)
    timers.add(timer)
  }
  let figure: HTMLDivElement | undefined

  onCleanup(() => timers.forEach(clearTimeout))

  const tear = () => {
    if (reduced) return
    setState("tear", Math.random())
    later(150, () => setState("tear", undefined))
  }

  const vanish = () => {
    if (!state.apparition) return
    if (state.apparition.kind !== "glimpse") tear()
    setState({ apparition: undefined, entered: false })
  }

  const appear = (kind: Kind, near = false) => {
    if (state.apparition) return
    const apparition = shape(kind, near)
    setState({ apparition, entered: false })
    if (kind === "close" || kind === "glimpse") tear()
    later(40, () => setState("entered", true))
    later(apparition.duration, vanish)
  }

  // The scheduled visits, only while the tube shows and the entity is on.
  createKeyed(
    () => ctx.stores.prefs.value.enabled && ctx.stores.prefs.value.entity !== false && !reduced,
    () => {
      const visit = () => {
        later(between(45_000, 150_000), () => {
          const roll = Math.random()
          appear(roll < 0.4 ? "glimpse" : roll < 0.72 ? "watcher" : roll < 0.93 ? "peek" : "close")
          visit()
        })
      }
      visit()

      const focus = () => {
        if (Math.random() < 0.2) later(120, () => appear("watcher", true))
      }
      window.addEventListener("focus", focus)
      onCleanup(() => window.removeEventListener("focus", focus))
    },
  )

  // Only summons made while it is mounted, not one made before the tube was switched on.
  const before = props.summons()
  createKeyed(
    () => (props.summons() > before ? props.summons() : undefined),
    () => {
      const kind = ORDER[state.summoned % ORDER.length] ?? "watcher"
      setState("summoned", (count) => count + 1)
      vanish()
      later(250, () => appear(kind))
    },
  )

  // A watcher never lets the pointer reach it.
  const approach = (event: PointerEvent) => {
    if (state.apparition?.kind !== "watcher" || !figure) return
    const rect = figure.getBoundingClientRect()
    const distance = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2))
    if (distance < Math.max(200, rect.height)) vanish()
  }
  window.addEventListener("pointermove", approach, { passive: true })
  onCleanup(() => window.removeEventListener("pointermove", approach))

  return (
    <div
      class="opencode-crt-entity"
      data-presence={state.apparition ? "" : undefined}
      data-tear={state.tear === undefined ? undefined : ""}
    >
      <Show when={state.apparition}>
        {(apparition) => (
          <div
            ref={figure}
            class="opencode-crt-figure"
            data-kind={apparition().kind}
            data-side={apparition().side}
            data-entered={state.entered ? "" : undefined}
            style={{
              "--x": `${apparition().x * 100}%`,
              "--floor": `${(1 - apparition().floor) * 100}%`,
              "--height": `${apparition().height * 100}%`,
              "--opacity": String(apparition().opacity),
              "--tilt": `${apparition().tilt}deg`,
              "--duration": `${apparition().duration}ms`,
            }}
          >
            <Figure close={apparition().kind === "close"} />
          </div>
        )}
      </Show>
      <Show when={state.tear}>
        {(position) => <div class="opencode-crt-tear" style={{ top: `${position() * 85}%` }} />}
      </Show>
    </div>
  )
}

function shape(kind: Kind, near: boolean): Apparition {
  const side = Math.random() < 0.5 ? "left" : "right"
  if (kind === "glimpse") {
    const far = Math.random()
    return {
      kind,
      side,
      x: Math.random() < 0.5 ? between(0.06, 0.3) : between(0.7, 0.94),
      floor: 0.72 + (1 - far) * 0.3,
      height: 0.22 + (1 - far) * 0.55,
      opacity: 0.92,
      tilt: between(-20, 20),
      duration: between(70, 170),
    }
  }
  if (kind === "watcher") {
    return {
      kind,
      side,
      x: near ? between(0.35, 0.65) : Math.random() < 0.5 ? between(0.05, 0.18) : between(0.82, 0.95),
      floor: near ? 1.04 : between(0.7, 0.8),
      height: near ? 0.95 : between(0.16, 0.26),
      opacity: near ? 0.85 : between(0.45, 0.7),
      tilt: (side === "left" ? -1 : 1) * between(28, 48),
      duration: near ? between(450, 800) : between(6_000, 13_000),
    }
  }
  if (kind === "peek") {
    return {
      kind,
      side,
      x: 0,
      floor: between(0.9, 1.05),
      height: between(0.7, 0.9),
      opacity: 0.88,
      tilt: (side === "left" ? 1 : -1) * between(70, 95),
      duration: 7_000,
    }
  }
  return { kind, side, x: 0.5, floor: 1, height: 1, opacity: 1, tilt: between(-12, 12), duration: 180 }
}

/**
 * A tall, thin silhouette with arms that hang past its knees, one longer than the other, and two pale eyes that do
 * not blink. Its edges boil: turbulence displaces them a little, with a new seed every few frames.
 */
function Figure(props: { readonly close: boolean }) {
  const id = createUniqueId()
  return (
    <svg
      viewBox={props.close ? "33 6 58 58" : "0 0 120 360"}
      preserveAspectRatio={props.close ? "xMidYMid slice" : "xMidYMax meet"}
      aria-hidden="true"
    >
      <defs>
        <filter id={`boil-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="1" result="noise">
            <animate attributeName="seed" values="1;7;3;11;5" dur="0.42s" calcMode="discrete" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
        <filter id={`eyes-${id}`} x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="0.9" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#boil-${id})`} fill="#040404">
        <path d="M52 194 C50 250 52 300 50 352 L56 352 C58 300 60 250 61 200 Z" />
        <path d="M62 200 C64 250 66 300 66 352 L72 352 C72 300 72 250 71 194 Z" />
        <path d="M44 82 C40 120 46 150 50 196 L72 196 C76 150 82 120 78 82 C70 78 52 78 44 82 Z" />
        <path d="M46 86 C36 120 34 180 32 240 C31 268 30 288 28 304 L33 305 C36 286 38 266 40 240 C43 182 46 130 52 96 Z" />
        <path d="M76 86 C86 118 90 170 90 220 C90 250 92 270 94 286 L99 285 C98 266 97 248 97 220 C97 168 92 116 82 90 Z" />
        <path
          d="M29 304 L24 336 M31 305 L30 341 M33 305 L36 335 M95 286 L92 318 M97 286 L99 321 M99 285 L105 314"
          stroke="#040404"
          stroke-width="1.6"
          stroke-linecap="round"
          fill="none"
        />
        <g class="opencode-crt-head">
          <path d="M57 48 C58 62 57 72 55 82 L67 82 C65 72 64 60 66 48 Z" />
          <ellipse cx="62" cy="33" rx="12.5" ry="17.5" transform="rotate(9 62 33)" />
        </g>
      </g>
      <g class="opencode-crt-head" filter={`url(#eyes-${id})`} fill="#e9e6d8">
        <circle cx="57.2" cy="31.5" r="1.45" />
        <circle cx="66.6" cy="33.4" r="1.15" />
      </g>
    </svg>
  )
}
