import { For } from "solid-js"
import { usePlugin } from "@opencode/plugin/gui"
import { defaults, type definition, type Prefs, type Tint } from "./definition"

type Knob = "curvature" | "scanlines" | "mask" | "aberration" | "bloom"

const knobs: Knob[] = ["curvature", "scanlines", "mask", "aberration", "bloom"]
const tints: Tint[] = ["none", "green", "amber"]

export function Settings() {
  const ctx = usePlugin<typeof definition>()
  const ui = ctx.ui
  const prefs = () => ctx.stores.prefs.value
  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    ctx.stores.prefs.update((draft) => {
      draft[key] = value
    })

  return (
    <div class="opencode-crt-settings">
      <div class="opencode-crt-row">
        <ui.Switch
          label={ctx.t("settings.enabled")}
          description={ctx.t("settings.enabled.description")}
          checked={prefs().enabled}
          onChange={(checked) => set("enabled", checked)}
        />
      </div>

      <For each={knobs}>
        {(knob) => (
          <label class="opencode-crt-row" data-disabled={!prefs().enabled || undefined}>
            <span class="opencode-crt-text">
              <span>{ctx.t(`settings.${knob}`)}</span>
              <span class="opencode-crt-muted">{ctx.t(`settings.${knob}.description`)}</span>
            </span>
            <span class="opencode-crt-range">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={prefs()[knob]}
                disabled={!prefs().enabled}
                onInput={(event) => set(knob, event.currentTarget.valueAsNumber)}
              />
              <span class="opencode-crt-value">{prefs()[knob]}</span>
            </span>
          </label>
        )}
      </For>

      <div class="opencode-crt-row" data-disabled={!prefs().enabled || undefined}>
        <span class="opencode-crt-text">
          <span>{ctx.t("settings.tint")}</span>
          <span class="opencode-crt-muted">{ctx.t("settings.tint.description")}</span>
        </span>
        <span class="opencode-crt-choices">
          <For each={tints}>
            {(tint) => (
              <ui.Button
                size="small"
                variant={prefs().tint === tint ? "contrast" : "neutral"}
                disabled={!prefs().enabled}
                onClick={() => set("tint", tint)}
              >
                {ctx.t(`tint.${tint}`)}
              </ui.Button>
            )}
          </For>
        </span>
      </div>

      <div class="opencode-crt-row">
        <ui.Switch
          label={ctx.t("settings.flicker")}
          description={ctx.t("settings.flicker.description")}
          checked={prefs().flicker}
          disabled={!prefs().enabled}
          onChange={(checked) => set("flicker", checked)}
        />
      </div>

      <div class="opencode-crt-row">
        <ui.Switch
          label={ctx.t("settings.entity")}
          description={ctx.t("settings.entity.description")}
          checked={prefs().entity !== false}
          disabled={!prefs().enabled}
          onChange={(checked) => set("entity", checked)}
        />
      </div>

      <div class="opencode-crt-footer">
        <ui.Button variant="ghost" icon="reset" onClick={() => ctx.stores.prefs.set({ ...defaults })}>
          {ctx.t("reset")}
        </ui.Button>
      </div>
    </div>
  )
}
