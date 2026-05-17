import type { SizeDefaults, SizePreset } from './types';

// Layout in floats (16-byte aligned blocks for std140-ish):
//   [0..1]  resolution        (vec2f)
//   [2..3]  innerSize         (vec2f)
//   [4]     radius            (f32)
//   [5]     strokeWidth       (f32)
//   [6]     bloomRadius       (f32)
//   [7]     innerGlow         (f32)
//   [8]     time              (f32)
//   [9]     duration          (f32)
//   [10]    strength          (f32)
//   [11]    brightness        (f32)
//   [12]    saturation        (f32)
//   [13]    colorCount        (u32)  — written via Uint32Array view
//   [14..15] _pad
//   [16..47] colors[8] (vec4f each = 4 floats × 8 = 32 floats)
export const UNIFORM_FLOAT_COUNT = 48;
export const UNIFORM_BYTE_SIZE = UNIFORM_FLOAT_COUNT * 4; // 192 bytes

export const SIZE_DEFAULTS: Record<SizePreset, SizeDefaults> = {
  sm: { strokeWidth: 1, bloomRadius: 12, innerGlow: 0.4 },
  md: { strokeWidth: 2, bloomRadius: 20, innerGlow: 0.6 },
  line: { strokeWidth: 0.5, bloomRadius: 6, innerGlow: 0.2 },
};

export interface UniformWriteInput {
  resolutionW: number;
  resolutionH: number;
  innerW: number;
  innerH: number;
  radius: number;
  strokeWidth: number;
  bloomRadius: number;
  innerGlow: number;
  time: number;
  duration: number;
  strength: number;
  brightness: number;
  saturation: number;
  colorCount: number;
  colorsRgba: Float32Array; // length >= 32
}

export function createUniformArray(): { floats: Float32Array; uints: Uint32Array; buffer: ArrayBuffer } {
  const buffer = new ArrayBuffer(UNIFORM_BYTE_SIZE);
  const floats = new Float32Array(buffer);
  const uints = new Uint32Array(buffer);
  return { floats, uints, buffer };
}

export function writeUniformArray(
  floats: Float32Array,
  uints: Uint32Array,
  input: UniformWriteInput,
): void {
  floats[0] = input.resolutionW;
  floats[1] = input.resolutionH;
  floats[2] = input.innerW;
  floats[3] = input.innerH;
  floats[4] = input.radius;
  floats[5] = input.strokeWidth;
  floats[6] = input.bloomRadius;
  floats[7] = input.innerGlow;
  floats[8] = input.time;
  floats[9] = input.duration;
  floats[10] = input.strength;
  floats[11] = input.brightness;
  floats[12] = input.saturation;
  uints[13] = input.colorCount;
  floats[14] = 0;
  floats[15] = 0;
  const stops = Math.min(input.colorsRgba.length, 32);
  for (let i = 0; i < stops; i++) {
    floats[16 + i] = input.colorsRgba[i] ?? 0;
  }
}
