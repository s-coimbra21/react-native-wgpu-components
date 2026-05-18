import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

export type ColorStop = string | { color: string; position?: number };

export type Mode = 'aura' | 'line';

export type PalettePreset = 'colorful' | 'mono' | 'ocean' | 'sunset';

export interface BorderBeamProps {
  colors?: PalettePreset | ColorStop[];
  /** Visual character of the effect. `aura` (default) is a soft diffuse glow; `line`
   * is a bright stroke that traces the border. */
  mode?: Mode;
  /** Multiplier on the effect's internal pixel sizes (stroke width, bloom radius).
   * The unscaled sizes auto-derive from the element's smaller half-dimension, so the
   * effect looks proportional across element sizes; use scale to amplify or attenuate.
   * Default 1. */
  scale?: number;
  borderRadius?: number;
  innerGlow?: number;

  active?: boolean;
  duration?: number;
  strength?: number;
  brightness?: number;
  saturation?: number;

  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Per-mode shape parameters. Stroke and bloom sizes are stored as factors of the
 * element's smaller half-dimension so the effect scales naturally with element size;
 * the absolute pixel values are resolved in `useBeamRenderer` once layout is known. */
export interface ModeDefaults {
  strokeWidthFactor: number;
  bloomRadiusFactor: number;
  innerGlow: number;
  strokeIntensity: number;
}
