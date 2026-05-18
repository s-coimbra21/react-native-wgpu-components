# Contributing

Thanks for considering a contribution! This document covers the day-to-day
loop — repo layout, scripts, where things live, and the conventions we follow.

## Repo layout

```
packages/react-native-wgpu-components/  the published npm package
apps/example/                            Expo Router demo (iOS, Android, Web)
apps/docs/                               fumadocs site (https://s-coimbra21.github.io/react-native-wgpu-components/)
```

The example app and the docs site are workspace consumers — they import from
the package source directly, so edits in `packages/react-native-wgpu-components/src`
are picked up live by Metro / Next.js.

## Setup

```sh
pnpm install
```

Requires Node ≥ 20 and pnpm ≥ 9.

## Scripts

From the repo root:

| Script | What it does |
|---|---|
| `pnpm typecheck` | type-check every workspace |
| `pnpm build` | build the package to `packages/react-native-wgpu-components/lib` |
| `pnpm example` | start the Expo dev server (Metro) for the example app |
| `pnpm web` | run the example app in a web browser |
| `pnpm ios` | run the example app in the iOS simulator |
| `pnpm android` | run the example app in an Android emulator |
| `pnpm docs:dev` | start the docs site dev server |
| `pnpm docs:build` | build the docs site to `apps/docs/out` |

## Adding a new component

1. Add `MyComponent.tsx` (and supporting files) under
   `packages/react-native-wgpu-components/src/`.
2. Export it from `packages/react-native-wgpu-components/src/index.ts`.
3. Add a demo screen under `apps/example/app/(tabs)/` or extend an existing one.
4. Add a docs page under `apps/docs/content/docs/` and link it from
   `apps/docs/content/docs/meta.json`.

## Shader work

The package's WGSL shader lives in TypeScript inside
`packages/react-native-wgpu-components/src/shader.ts`. Functions marked
with `'use gpu'` get transformed to WGSL at build time by `unplugin-typegpu`.

A few things to remember:

- The `beamLayout.$.uniforms` accessor only works inside `'use gpu'` function
  bodies. At module scope it throws — the proxy needs to be in codegen mode.
- `tgpu.fn` produces a `DualFn` that's also callable from regular JS. The
  shared `perimeterCoord` is called from both the GPU and the JS render loop.
- Visual changes need visual verification. Type-checks pass on math errors.
  Reload the demo screens and look.

## Commits & PRs

- Imperative mood (`Add X`, not `Added X`).
- Subject under ~70 chars. Use the body for the why.
- One conceptual change per commit when practical.
- Open a PR against `main`. CI runs typecheck + builds on PRs.

## Releasing

(WIP — not yet automated.)

## Code of conduct

Be kind. Assume good faith. Help newer contributors. Disagreements happen — keep
them about the work, not the person.
