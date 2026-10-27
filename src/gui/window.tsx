import { createSignal } from "solid-js"
import { render } from "solid-js/web"
import { bindPlugin, Command, SettingsPage, Style, type Plugin } from "@opencode/plugin/gui"
import { defaults, type definition, type Tint } from "./definition"
import { frame } from "./layout"
import { Screen } from "./screen"
import { Settings } from "./settings"
import settingsCss from "./settings.css?inline"
import tubeCss from "./tube.css?inline"

const tints: Tint[] = ["none", "green", "amber"]

export const setup: Plugin.Setup<typeof definition> = (ctx) => {
  const prefs = ctx.stores.prefs

  ctx.add(Style, settingsCss)
  ctx.add(Style, () => {
    if (!prefs.value.enabled) return undefined
    const edge = frame(ctx.app.platform === "desktop", ctx.desktop?.zoom() ?? 1)
    return `:root{--crt-top:${edge.top}px;--crt-side:${edge.side}px;--crt-bottom:${edge.bottom}px}\n${tubeCss}`
  })

  ctx.add(
    Command,
    (): Command => ({
      id: "toggle",
      title: ctx.t("command.toggle"),
      group: ctx.t("command.group"),
      keywords: "crt retro monitor scanlines filter",
      bind: "mod+alt+shift+c",
      featured: true,
      run: () => {
        prefs.update((draft) => {
          draft.enabled = !draft.enabled
        })
        ctx.toast.show({ title: ctx.t(prefs.value.enabled ? "toast.on" : "toast.off"), duration: 1500 })
      },
    }),
  )

  ctx.add(Command, () => ({
    id: "tint",
    title: ctx.t("command.tint"),
    group: ctx.t("command.group"),
    keywords: "crt phosphor green amber monochrome",
    enabled: prefs.value.enabled,
    run: () => {
      const next = tints[(tints.indexOf(prefs.value.tint) + 1) % tints.length] ?? defaults.tint
      prefs.update((draft) => {
        draft.tint = next
      })
      ctx.toast.show({ title: ctx.t("toast.tint", { tint: ctx.t(`tint.${next}`) }), duration: 1500 })
    },
  }))

  // Each summon shows the next of its behaviours, for demos.
  const [summons, setSummons] = createSignal(0)

  ctx.add(Command, () => ({
    id: "summon",
    title: ctx.t("command.summon"),
    group: ctx.t("command.group"),
    keywords: "crt entity backrooms horror ghost",
    enabled: prefs.value.enabled,
    run: () => void setSummons((count) => count + 1),
  }))

  ctx.add(Command, () => ({
    id: "settings",
    title: ctx.t("command.settings"),
    group: ctx.t("command.group"),
    keywords: "crt",
    run: () => ctx.layout.settings("crt"),
  }))

  ctx.add(SettingsPage, {
    id: "crt",
    icon: "monitor",
    get title() {
      return ctx.t("title")
    },
    get entries() {
      return ["enabled", "curvature", "scanlines", "mask", "aberration", "bloom", "flicker", "tint", "entity"].map((id) => ({
        id,
        title: ctx.t(`settings.${id}`),
        description: ctx.t(`settings.${id}.description`),
      }))
    },
    render: () => <Settings />,
  })

  // The tube wraps the whole document, outside the app's own tree, so it covers every route, dialog and toast.
  const host = document.createElement("div")
  host.dataset.opencodeCrt = ""
  document.documentElement.append(host)
  const Bound = bindPlugin(Screen)
  const dispose = render(() => <Bound summons={summons} />, host)

  return () => {
    dispose()
    host.remove()
  }
}
