import { type BrowserWindow, type MouseInputEvent, nativeTheme, type Rectangle, WebContentsView } from "electron"
import type { Plugin } from "@opencode/plugin/gui"
import { Tube, type TubeShape } from "./contract"
import { TITLEBAR } from "./layout"

const PAGE = `<!doctype html><html style="background:transparent;height:100%;user-select:none"><body style="margin:0;height:100%"></body></html>`

// Chromium cursor types whose CSS name differs.
const CURSORS: Record<string, string> = {
  nodrop: "no-drop",
  custom: "default",
  "m-panning": "all-scroll",
  "m-panning-vertical": "ns-resize",
  "m-panning-horizontal": "ew-resize",
}

/**
 * The page is bent by an SVG filter, but Chromium hit-tests the flat layout, so a click lands where the flat UI
 * is, not where the glass shows it. A transparent view over the tube takes the real pointer instead, and sends
 * each event on to the page at the point the filter samples for that pixel. The page gets trusted input, so
 * hover, focus, text selection, dragging, the wheel and context menus all behave as without the filter.
 *
 * On Windows the monitor case draws its own window buttons, so the native ones keep working but draw no glyphs.
 */
export const main: Plugin.MainSetup = (ctx) => {
  const tubes = new Map<number, ReturnType<typeof mount>>()
  const unmount = (id: number) => {
    tubes.get(id)?.dispose()
    tubes.delete(id)
  }

  ctx.provide(Tube(ctx.id), {
    set: (shape, caller) => {
      const win = ctx.windows.get(caller.window)

      if (!win || win.isDestroyed() || !shape.enabled || shape.width < 1 || shape.height < 1) {
        unmount(caller.window)
        return
      }

      const tube = tubes.get(caller.window) ?? mount(win)
      tubes.set(caller.window, tube)
      tube.reshape(shape)
    },
  })

  ctx.windows.on("close", (win) => unmount(win.id))

  // The app sets its titlebar overlay again when the theme changes; hide the glyphs again after it.
  const retitle = () => setImmediate(() => tubes.forEach((tube) => tube.titlebar()))
  nativeTheme.on("updated", retitle)
  ctx.onCleanup(() => {
    nativeTheme.off("updated", retitle)
  })

  return () => [...tubes.keys()].forEach(unmount)
}

function mount(win: BrowserWindow) {
  const app = win.webContents
  const root = win.contentView
  const view = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } })
  const state = { shape: undefined as TubeShape | undefined, inside: false }

  view.setBackgroundColor("#00000000")
  void view.webContents.loadURL(`data:text/html,${encodeURIComponent(PAGE)}`)

  // Just above the page, below the app's own embeds such as the browser pane.
  const index = root.children.findIndex((child) => child instanceof WebContentsView && child.webContents === app)
  root.addChildView(view, index >= 0 ? index + 1 : 0)

  // The input layer never keeps focus: keys belong to the page.
  view.webContents.on("focus", () => app.focus())
  view.webContents.on("will-navigate", (event) => event.preventDefault())
  view.webContents.setWindowOpenHandler(() => ({ action: "deny" }))

  view.webContents.on("before-mouse-event", (event, input) => {
    const shape = state.shape
    if (!shape) return
    event.preventDefault()
    forward(input, shape)
  })

  function forward(input: MouseInputEvent, shape: TubeShape) {
    const bounds = view.getBounds()
    const u = (input.x / bounds.width) * 2 - 1
    const v = (input.y / bounds.height) * 2 - 1
    // The curve the displacement map draws: the glass at (u, v) shows the flat page at (su, sv).
    const su = u + shape.bend * u * v * v
    const sv = v + shape.bend * v * u * u
    const held = input.modifiers?.some((modifier) => modifier.endsWith("buttondown")) ?? false
    const glass = Math.abs(su) <= 1 && Math.abs(sv) <= 1
    const target = point(bounds, su, sv)

    if (input.type === "mouseDown") app.focus()

    // Off the picture, in the black corners: the page sees the pointer leave, unless a drag is going on.
    if (!glass && !held && input.type !== "mouseWheel" && input.type !== "mouseUp") {
      if (state.inside) app.sendInputEvent({ type: "mouseLeave", ...target })
      state.inside = false
      return
    }

    if (!state.inside && input.type !== "mouseLeave") app.sendInputEvent({ type: "mouseEnter", ...target })
    state.inside = input.type !== "mouseLeave"
    app.sendInputEvent({ ...input, ...target })
  }

  const cursor = (_event: unknown, type: string) => {
    const css = JSON.stringify(CURSORS[type] ?? type)
    void view.webContents
      .executeJavaScript(`{const s=document.documentElement.style;s.cursor="default";s.cursor=${css}}`)
      .catch(() => undefined)
  }
  app.on("cursor-changed", cursor)

  function titlebar() {
    if (process.platform !== "win32" || win.isDestroyed()) return
    const zoom = app.getZoomFactor()
    win.setTitleBarOverlay({
      color: "#00000000",
      symbolColor: state.shape ? "#00000000" : nativeTheme.shouldUseDarkColors ? "white" : "black",
      height: Math.max(TITLEBAR, Math.round(TITLEBAR * zoom)),
    })
  }

  return {
    titlebar,
    reshape(shape: TubeShape) {
      state.shape = shape
      // Cheap, and the app resets the overlay on zoom changes, which always resize the tube.
      titlebar()
      const zoom = app.getZoomFactor()
      view.setBounds({
        x: Math.round(shape.x * zoom),
        y: Math.round(shape.y * zoom),
        width: Math.round(shape.width * zoom),
        height: Math.round(shape.height * zoom),
      })
    },
    dispose() {
      state.shape = undefined
      titlebar()
      if (!app.isDestroyed()) app.off("cursor-changed", cursor)
      if (!win.isDestroyed()) root.removeChildView(view)
      if (!view.webContents.isDestroyed()) view.webContents.close()
    },
  }
}

function point(bounds: Rectangle, su: number, sv: number) {
  const clamp = (value: number) => Math.min(1, Math.max(-1, value))
  return {
    x: Math.round(bounds.x + ((clamp(su) + 1) / 2) * bounds.width),
    y: Math.round(bounds.y + ((clamp(sv) + 1) / 2) * bounds.height),
  }
}
