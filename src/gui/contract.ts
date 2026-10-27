import { Schema } from "effect"
import { Ipc } from "@opencode/plugin/gui"

/**
 * Where the tube sits in the window, in CSS pixels, and how much it bends. `main` covers that rect with an input
 * layer and sends every pointer event on to the page at the point the curved glass shows there.
 */
export const TubeShape = Schema.Struct({
  enabled: Schema.Boolean,
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
  bend: Schema.Number,
})
export type TubeShape = typeof TubeShape.Type

/**
 * An Ipc id must start with the plugin's id: the package name from npm or GitHub, or the folder name locally. Both
 * setups build the token from `ctx.id`.
 */
export const Tube = (id: string) =>
  Ipc.define({
    id: `${id}.tube`,
    methods: {
      set: { input: TubeShape },
    },
  })
