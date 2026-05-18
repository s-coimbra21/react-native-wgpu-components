# react-native-wgpu-components

> GPU-accelerated UI components for React Native — iOS, Android, and Web through a single API.

[![CI](https://github.com/s-coimbra21/react-native-wgpu-components/actions/workflows/ci.yml/badge.svg)](https://github.com/s-coimbra21/react-native-wgpu-components/actions/workflows/ci.yml)
[![Docs](https://github.com/s-coimbra21/react-native-wgpu-components/actions/workflows/docs.yml/badge.svg)](https://s-coimbra21.github.io/react-native-wgpu-components/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A small collection of GPU-rendered UI components for React Native. Built on
[react-native-wgpu](https://github.com/wcandillon/react-native-webgpu),
[TypeGPU](https://docs.swmansion.com/TypeGPU/), and
[Reanimated](https://docs.swmansion.com/react-native-reanimated/) v4. The
shaders are authored in TypeScript via TypeGPU's `'use gpu'` Babel transform,
so cross-platform output is a single ESM bundle.

Today the package ships one component: `<BorderBeam>` — an animated GPU
border glow. More components welcome.

📚 **[Documentation →](https://s-coimbra21.github.io/react-native-wgpu-components/)**

## Install

```sh
pnpm add react-native-wgpu-components \
  react-native-wgpu \
  react-native-webgpu-worklets \
  react-native-reanimated \
  react-native-worklets \
  typegpu
```

Add the Babel plugins to your app's `babel.config.js`:

```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    'unplugin-typegpu/babel',
    'react-native-worklets/plugin', // must be last
  ],
};
```

`react-native-gesture-handler` is an optional peer — required only if you
use `followCursor`.

## Usage

```tsx
import { BorderBeam } from 'react-native-wgpu-components';
import { View, Text } from 'react-native';

export function Example() {
  return (
    <BorderBeam colors="colorful" borderRadius={16} duration={3}>
      <View style={{ padding: 24, backgroundColor: '#1d1d1d', borderRadius: 16 }}>
        <Text style={{ color: 'white' }}>Hello, beam.</Text>
      </View>
    </BorderBeam>
  );
}
```

See the [docs site](https://s-coimbra21.github.io/react-native-wgpu-components/)
for the full prop reference, palette presets, cursor tracking, and recipes.

## Components

- [`<BorderBeam>`](https://s-coimbra21.github.io/react-native-wgpu-components/docs/border-beam) — animated GPU border glow with `aura` and `line` modes, palette presets, custom gradient stops, and optional cursor tracking.

## Repo layout

```
packages/react-native-wgpu-components/   the published package
apps/example/                             Expo Router demo (iOS, Android, Web)
apps/docs/                                fumadocs site
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, scripts, and
guidelines for adding components.

## Requirements

| | Minimum |
|---|---|
| React Native | 0.81 (new architecture) |
| React | 19.0 |
| Expo (if used) | 55 |
| `react-native-wgpu` | 0.5 |
| `react-native-reanimated` | 4.1 |
| `typegpu` | 0.11 |

## Platforms

| | Backend | Status |
|---|---|---|
| iOS | Metal | Stable |
| Android | Vulkan | Stable |
| Web | WebGPU | Chrome / Edge / Safari 18+ |

On platforms without WebGPU, components mount a no-op canvas and log once.

## Acknowledgements

The original [`border-beam`](https://github.com/Jakubantalik/border-beam) CSS
effect by Jakub Antalik for React/CSS — this package's `<BorderBeam>` is a
port of that visual.

## License

[MIT](./LICENSE)
