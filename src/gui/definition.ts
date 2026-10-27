import { Schema } from "effect"
import { Plugin, Store } from "@opencode/plugin/gui"

export const Tint = Schema.Literals(["none", "green", "amber"])
export type Tint = typeof Tint.Type

export const Prefs = Schema.Struct({
  enabled: Schema.Boolean,
  curvature: Schema.Number,
  scanlines: Schema.Number,
  mask: Schema.Number,
  aberration: Schema.Number,
  bloom: Schema.Number,
  flicker: Schema.Boolean,
  tint: Tint,
  // Optional so settings stored before it existed still load.
  entity: Schema.optional(Schema.Boolean),
})
export type Prefs = typeof Prefs.Type

export const defaults: Prefs = {
  enabled: true,
  curvature: 35,
  scanlines: 40,
  mask: 25,
  aberration: 30,
  bloom: 30,
  flicker: true,
  tint: "none",
  entity: true,
}

export const definition = Plugin.define({
  stores: {
    prefs: Store.global(Prefs, defaults),
  },
  i18n: {
    en: {
      title: "CRT",
      "command.toggle": "Toggle CRT filter",
      "command.tint": "Cycle CRT phosphor",
      "command.settings": "Open CRT settings",
      "command.group": "CRT",
      "command.summon": "Summon the entity",
      "settings.entity": "Something in the static",
      "settings.entity.description": "Now and then, something stands in the picture where it should not be.",
      "toast.on": "CRT on",
      "toast.off": "CRT off",
      "toast.tint": "Phosphor: {{tint}}",
      "settings.enabled": "CRT filter",
      "settings.enabled.description": "Render the whole window as a curved cathode-ray tube.",
      "settings.curvature": "Curvature",
      "settings.curvature.description": "Barrel distortion of the glass. The pointer follows the curve.",
      "settings.scanlines": "Scanlines",
      "settings.scanlines.description": "Dark gaps between the electron beam's lines.",
      "settings.mask": "Shadow mask",
      "settings.mask.description": "Red, green and blue phosphor stripes of an aperture grille.",
      "settings.aberration": "Convergence error",
      "settings.aberration.description": "The red and blue beams miss the green one by a little.",
      "settings.bloom": "Bloom",
      "settings.bloom.description": "Bright phosphors glow into their neighbours.",
      "settings.flicker": "Flicker and roll",
      "settings.flicker.description": "Refresh flicker and a slow rolling band. Off when the system reduces motion.",
      "settings.tint": "Phosphor",
      "settings.tint.description": "Colour monitor, or a green P1 or amber P3 monochrome tube.",
      "tint.none": "Colour",
      "tint.green": "Green",
      "tint.amber": "Amber",
      reset: "Reset to defaults",
    },
  },
})
