import type { StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

export type ColorStop = string | { color: string; position?: number };

export type SizePreset = 'sm' | 'md' | 'line';

export type PalettePreset = 'colorful' | 'mono' | 'ocean' | 'sunset';

export interface BorderBeamProps {
  colors?: PalettePreset | ColorStop[];
  size?: SizePreset;
  borderRadius?: number;
  strokeWidth?: number;
  bloomRadius?: number;
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

export interface SizeDefaults {
  strokeWidth: number;
  bloomRadius: number;
  innerGlow: number;
  // Per-preset intensity for the on-border stroke band. `line` uses a high value so
  // its dominant visual is a glowing line tracing the border; `sm`/`md` use 0 to keep
  // the soft interior haze unchanged.
  strokeIntensity: number;
}

export interface ResolvedBeamProps {
  colorsRgba: Float32Array;
  colorCount: number;
  borderRadius: number;
  strokeWidth: number;
  bloomRadius: number;
  innerGlow: number;
  duration: number;
  strength: number;
  brightness: number;
  saturation: number;
}
