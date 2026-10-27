# opencode-crt

An [OpenCode Desktop](https://opencode.ai) GUI plugin that renders the whole window as a curved cathode-ray tube: barrel distortion, scanlines, shadow mask, convergence error, bloom and flicker. Pointer input follows the curved glass.

## Install

From GitHub:

```sh
opencode plugin add github:Hona/opencode-crt
```

From npm:

```sh
opencode plugin add @hona/opencode-crt
```

Or list it in your global `opencode.json(c)`:

```jsonc
{
  "plugins": ["github:Hona/opencode-crt"],
}
```

Configure it in **Settings**. Turn it off in **Settings › Extensions › Plugins**.

## Develop

```sh
bun install
bun run dev
```

`bun run dev` rebuilds `dist/gui-experimental.cjs` on every change. Point your config at the folder (`"plugins": ["/path/to/opencode-crt"]`) and OpenCode Desktop reloads the plugin on each rebuild.

`dist/` is committed so that GitHub installs, which do not run build scripts, get the bundle.
