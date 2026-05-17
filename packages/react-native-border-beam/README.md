# react-native-border-beam

GPU-accelerated animated border-glow component for React Native — iOS, Android, and Web through a single API.

```sh
pnpm add react-native-border-beam react-native-wgpu react-native-webgpu-worklets react-native-reanimated react-native-worklets typegpu
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

## Usage

```tsx
import { BorderBeam } from 'react-native-border-beam';
import { View, Text } from 'react-native';

export function Example() {
  return (
    <BorderBeam colors="colorful" borderRadius={16} duration={2}>
      <View style={{ padding: 24, backgroundColor: '#1d1d1d', borderRadius: 16 }}>
        <Text style={{ color: 'white' }}>Hello, beam.</Text>
      </View>
    </BorderBeam>
  );
}
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `colors` | `'colorful' \| 'mono' \| 'ocean' \| 'sunset' \| ColorStop[]` | `'colorful'` | Named preset or custom stops. `ColorStop = string \| { color: string; position?: number }`. |
| `size` | `'sm' \| 'md' \| 'line'` | `'md'` | Controls default `strokeWidth`, `bloomRadius`, `innerGlow`. |
| `borderRadius` | `number` | `16` | px. |
| `strokeWidth` | `number` | from preset | px. |
| `bloomRadius` | `number` | from preset | px; the canvas extends past children by this amount. |
| `innerGlow` | `number` | from preset | 0–1. |
| `active` | `boolean` | `true` | Smoothly fades the effect in/out via Reanimated. |
| `duration` | `number` | `2` | Seconds per orbit. |
| `strength` | `number` | `1` | 0–1 overall opacity multiplier. |
| `brightness` | `number` | `1.3` | Stroke intensity multiplier. |
| `saturation` | `number` | `1.2` | Color saturation multiplier. |
| `style` | `StyleProp<ViewStyle>` | — | Applied to the children wrapper. |
| `containerStyle` | `StyleProp<ViewStyle>` | — | Applied to the outer view. |

## License

MIT
