import type { ColorStop, PalettePreset } from './types';

const PRESETS: Record<PalettePreset, string[]> = {
  colorful: ['#ff3d00', '#ffd600', '#00e676', '#00b0ff', '#d500f9', '#ff3d00'],
  mono: ['#ffffff', 'rgba(255,255,255,0.2)', '#ffffff'],
  ocean: ['#00b0ff', '#1de9b6', '#00b0ff'],
  sunset: ['#ff3d00', '#ffab00', '#ff3d00'],
};

const MAX_STOPS = 8;

export function isPalettePreset(value: unknown): value is PalettePreset {
  return (
    value === 'colorful' || value === 'mono' || value === 'ocean' || value === 'sunset'
  );
}

export function resolveColors(
  input: PalettePreset | ColorStop[] | undefined,
): { rgba: Float32Array; count: number } {
  const stops = normalizeStops(input ?? 'colorful');
  const count = Math.min(stops.length, MAX_STOPS);
  const rgba = new Float32Array(MAX_STOPS * 4);
  for (let i = 0; i < count; i++) {
    const s = stops[i];
    if (!s) continue;
    rgba[i * 4 + 0] = s[0];
    rgba[i * 4 + 1] = s[1];
    rgba[i * 4 + 2] = s[2];
    rgba[i * 4 + 3] = s[3];
  }
  return { rgba, count };
}

function normalizeStops(input: PalettePreset | ColorStop[]): [number, number, number, number][] {
  if (isPalettePreset(input)) {
    return PRESETS[input].map(parseColor);
  }
  if (input.length === 0) {
    return PRESETS.colorful.map(parseColor);
  }
  return input.map((stop) =>
    typeof stop === 'string' ? parseColor(stop) : parseColor(stop.color),
  );
}

// Parse a CSS-ish color (#rgb, #rrggbb, #rrggbbaa, rgba(r,g,b,a), rgb(r,g,b)) into [r,g,b,a] 0..1.
export function parseColor(input: string): [number, number, number, number] {
  const s = input.trim().toLowerCase();
  if (s.startsWith('#')) return parseHex(s.slice(1));
  if (s.startsWith('rgba') || s.startsWith('rgb')) return parseRgbFunctional(s);
  return [1, 1, 1, 1];
}

function parseHex(hex: string): [number, number, number, number] {
  if (hex.length === 3) {
    const r = parseInt(hex[0]! + hex[0]!, 16) / 255;
    const g = parseInt(hex[1]! + hex[1]!, 16) / 255;
    const b = parseInt(hex[2]! + hex[2]!, 16) / 255;
    return [r, g, b, 1];
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return [r, g, b, 1];
  }
  if (hex.length === 8) {
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = parseInt(hex.slice(6, 8), 16) / 255;
    return [r, g, b, a];
  }
  return [1, 1, 1, 1];
}

function parseRgbFunctional(s: string): [number, number, number, number] {
  const open = s.indexOf('(');
  const close = s.indexOf(')');
  if (open < 0 || close < 0) return [1, 1, 1, 1];
  const parts = s
    .slice(open + 1, close)
    .split(',')
    .map((p) => parseFloat(p.trim()));
  const [r = 0, g = 0, b = 0, a = 1] = parts;
  return [r / 255, g / 255, b / 255, a];
}
