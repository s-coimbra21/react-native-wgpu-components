# react-native-border-beam

A GPU-accelerated animated border-glow component for React Native — works on **iOS, Android, and Web** with a single API. Inspired by [`border-beam`](https://github.com/Jakubantalik/border-beam) for React/CSS.

Rendered via [`react-native-wgpu`](https://github.com/wcandillon/react-native-webgpu), with the shader authored in TypeScript using [TypeGPU](https://docs.swmansion.com/TypeGPU/) and animations driven by [Reanimated](https://docs.swmansion.com/react-native-reanimated/) v4. On native, the render loop runs on the UI thread via [`react-native-webgpu-worklets`](https://github.com/software-mansion-labs/react-native-webgpu-worklets).

```tsx
import { BorderBeam } from 'react-native-border-beam';

<BorderBeam colors="colorful" borderRadius={16} duration={3}>
  <View style={{ padding: 24, backgroundColor: '#1d1d1d', borderRadius: 16 }}>
    <Text style={{ color: 'white' }}>Hello, beam.</Text>
  </View>
</BorderBeam>
```

See `example/` for an Expo Router demo with Buttons, Card, Input, and an interactive Playground screen.

## Repo layout

- `packages/react-native-border-beam` — the published package
- `example/` — Expo Router demo app (iOS / Android / Web)
- `docs/superpowers/specs/2026-05-17-react-native-border-beam-design.md` — design spec

## Scripts

```sh
pnpm install
pnpm typecheck     # type-check the package and example
pnpm build         # build the package (tsc → packages/*/lib)
pnpm example       # start the Expo dev server (Metro)
pnpm web           # run the example app in a web browser
pnpm ios           # run the example app in iOS simulator
pnpm android       # run the example app in Android emulator
```

Requires Node ≥ 20, pnpm ≥ 9, React Native ≥ 0.81 (new architecture).

## License

MIT
