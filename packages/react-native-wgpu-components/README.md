# react-native-wgpu-components

GPU-accelerated UI components for React Native — iOS, Android, and Web through a single API. Built on [react-native-wgpu](https://github.com/wcandillon/react-native-webgpu), [TypeGPU](https://docs.swmansion.com/TypeGPU/), and [Reanimated](https://docs.swmansion.com/react-native-reanimated/) v4.

> Currently ships one component, `<BorderBeam>` — a port of the [`border-beam`](https://github.com/Jakubantalik/border-beam) CSS effect. More components welcome.

📚 **[Full documentation →](https://s-coimbra21.github.io/react-native-wgpu-components/)**

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

`react-native-gesture-handler` is an optional peer dep — only required if you use `followCursor`.

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

See the [docs site](https://s-coimbra21.github.io/react-native-wgpu-components/) for the full prop reference, palette presets, and recipes.

## License

MIT
