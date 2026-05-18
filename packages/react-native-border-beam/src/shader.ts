// TypeGPU-authored shader. The previous version was a raw WGSL template string;
// rewriting in TypeGPU gives us:
//   - Type-checked uniform layout (the d.struct below IS the GPU contract).
//   - A single source of truth for perimeterCoord (callable from JS too, since
//     tgpu.fn produces a DualFn that runs on both the GPU and the JS thread).
//   - WGSL emitted by the `unplugin-typegpu` Babel plugin.

import tgpu from 'typegpu';
import * as d from 'typegpu/data';
import * as std from 'typegpu/std';

export { fullScreenTriangle } from 'typegpu/common';

// ----- tunable constants (formerly inline magic numbers in the WGSL string) -----

const COLOR_DRIFT_RATE = 0.45;   // gradient cycles per duration cycle
const COLOR_DRIFT_WOBBLE = 0.07; // sinusoidal wobble amplitude
const COLOR_DRIFT_FREQ = 1.7;    // wobble frequency, cycles per duration cycle
const SWEEP_SIGMA = 0.22;        // tanFade gaussian sigma (perimeter fraction)
const INNER_FADE_K = 1.4;        // elliptical inner-fade steepness
const GLASS_GAIN = 0.55;         // master multiplier on the glass haze
const STROKE_BAND_FACTOR = 4.0;  // multiplier on u.strokeWidth → band width
const MIN_STROKE_BAND = 3.0;     // floor for the stroke gaussian width
const INTENSITY_CLAMP = 1.5;     // max combined glass+stroke after brightness

// ----- uniform struct -----

/**
 * GPU-side layout of the per-frame uniform. Field order matters: TypeGPU emits
 * std140-style padding automatically, but reordering breaks the CPU-side write
 * path that fills this struct each frame.
 */
export const BeamUniforms = d.struct({
  resolution:      d.vec2f,
  innerSize:       d.vec2f,
  radius:          d.f32,
  strokeWidth:     d.f32,
  bloomRadius:     d.f32,
  innerGlow:       d.f32,
  time:            d.f32,
  duration:        d.f32,    // CPU guarantees >= 0.05
  strength:        d.f32,
  brightness:      d.f32,
  saturation:      d.f32,
  colorCount:      d.u32,
  strokeIntensity: d.f32,
  head:            d.f32,    // perimeter coord ∈ [0,1) for the bright sweep
  colors:          d.arrayOf(d.vec4f, 8),
});

/**
 * Bind group layout. TypeGPU emits the @group/@binding annotations
 * automatically from this declaration.
 *
 * NOTE: `beamLayout.$.uniforms` triggers a proxy that throws outside codegen
 * mode, so we only access it inside `'use gpu'` function bodies (where Babel
 * transforms the access into WGSL during shader resolution).
 */
export const beamLayout = tgpu.bindGroupLayout({
  uniforms: { uniform: BeamUniforms },
});

// ----- helpers -----

/**
 * Signed distance to a rounded box centred at the origin. `p` is the pixel
 * coordinate, `b` is the box half-extents, `r` is the corner radius.
 */
export const sdRoundBox = tgpu.fn([d.vec2f, d.vec2f, d.f32], d.f32)((p, b, r) => {
  'use gpu';
  const q = std.add(std.sub(std.abs(p), b), d.vec2f(r));
  return (
    std.min(std.max(q.x, q.y), 0) +
    std.length(std.max(q, d.vec2f(0))) -
    r
  );
});

/**
 * Map a pixel position p (centred on the inner rect) to a smooth, cyclic
 * coordinate s in [0,1), starting at top-centre and increasing clockwise.
 * Cast a ray from origin at atan2(p.y,p.x), intersect with the rect's
 * bounding box, and return arc length / perimeter so the palette is evenly
 * distributed by perimeter length (not angle).
 *
 * This function is ALSO called from the JS render loop to convert a cursor
 * position into the same `s` coordinate the shader uses. tgpu.fn produces a
 * DualFn that works in both targets.
 */
export const perimeterCoord = tgpu.fn([d.vec2f, d.vec2f], d.f32)((p, halfInner) => {
  'use gpu';
  const W = std.max(halfInner.x, 1);
  const H = std.max(halfInner.y, 1);

  const angle = std.atan2(p.y, p.x);
  const dir = d.vec2f(std.cos(angle), std.sin(angle));
  const safeAbsX = std.max(std.abs(dir.x), 0.0001);
  const safeAbsY = std.max(std.abs(dir.y), 0.0001);
  const tx = W / safeAbsX;
  const ty = H / safeAbsY;
  const t = std.min(tx, ty);
  const hit = std.mul(dir, t);

  const onVertical = tx < ty;
  const perim = 4 * (W + H);

  let arc = d.f32(0);
  if (onVertical) {
    if (hit.x > 0) {
      arc = W + (hit.y + H);
    } else {
      arc = 3 * W + 2 * H + (H - hit.y);
    }
  } else if (hit.y < 0) {
    if (hit.x >= 0) {
      arc = hit.x;
    } else {
      arc = 3 * W + 4 * H + (hit.x + W);
    }
  } else {
    arc = W + 2 * H + (W - hit.x);
  }

  return std.fract(arc / std.max(perim, 0.0001));
});

/**
 * Cyclic linear interpolation of a normalized palette by sampling u.colors,
 * wrapping the last stop back to the first. `s` is the perimeter coord.
 */
const sampleGradient = tgpu.fn([d.f32], d.vec4f)((s) => {
  'use gpu';
  const u = beamLayout.$.uniforms;
  const count = u.colorCount;
  if (count === 0) return d.vec4f(1, 1, 1, 1);
  if (count === 1) return u.colors[0]!;
  const n = d.f32(count);
  const pos = s * n;
  const lo = d.u32(std.floor(pos)) % count;
  const hi = (lo + 1) % count;
  const t = std.fract(pos);
  return std.mix(u.colors[lo]!, u.colors[hi]!, t);
});

const adjustSaturation = tgpu.fn([d.vec3f, d.f32], d.vec3f)((rgb, sat) => {
  'use gpu';
  const luma = std.dot(rgb, d.vec3f(0.299, 0.587, 0.114));
  return std.mix(d.vec3f(luma), rgb, sat);
});

// ----- fragment entry -----

export const beamFragment = tgpu.fragmentFn({
  in: { uv: d.vec2f },
  out: d.vec4f,
})(({ uv }) => {
  'use gpu';
  const u = beamLayout.$.uniforms;
  const pix = std.mul(std.sub(uv, d.vec2f(0.5)), u.resolution);
  const halfInner = std.mul(u.innerSize, 0.5);

  const dist = sdRoundBox(pix, halfInner, u.radius);
  const s = perimeterCoord(pix, halfInner);

  // Gradient drift uses u.time so colours keep flowing even when head is
  // locked to a stationary cursor.
  const cycles = u.time / u.duration;
  const colorDrift =
    cycles * COLOR_DRIFT_RATE + COLOR_DRIFT_WOBBLE * std.sin(cycles * COLOR_DRIFT_FREQ);
  const rotatedS = std.fract(s - colorDrift + 1);
  const color = sampleGradient(rotatedS);

  // Wide feathered tangential sweep that rotates with head.
  const tailDist = std.fract(u.head - s + 1);
  const symDist = std.min(tailDist, 1 - tailDist);
  const tanFade = std.exp(-std.pow(symDist / SWEEP_SIGMA, 2));

  // Inside fade: radial in elliptical coords (iso-contours are ellipses, not
  // parallel offsets of the rect's border) so we don't draw a ghost rect.
  const safeHalf = std.max(halfInner, d.vec2f(1));
  const ellipticalDist = std.length(std.div(pix, safeHalf));
  const innerFade = 1 - std.exp(-std.pow(ellipticalDist * INNER_FADE_K, 2));

  const outwardReach = u.bloomRadius; // already floored CPU-side via MIN_BLOOM_PX.
  const outerDist = std.max(dist, 0);
  const isInside = std.select(d.f32(0), d.f32(1), dist <= 0);
  const perpFade =
    innerFade * isInside +
    std.exp(-std.pow(outerDist / outwardReach, 2)) * (1 - isInside);

  const glass = tanFade * perpFade * u.innerGlow * GLASS_GAIN;

  const strokeBand = std.max(u.strokeWidth * STROKE_BAND_FACTOR, MIN_STROKE_BAND);
  const strokeFade = std.exp(-std.pow(std.abs(dist) / strokeBand, 2));
  const stroke = strokeFade * tanFade * u.strokeIntensity;

  const intensity = std.clamp((glass + stroke) * u.brightness, 0, INTENSITY_CLAMP);

  let rgb = std.mul(color.xyz, intensity);
  rgb = adjustSaturation(rgb, u.saturation);
  const alpha = std.clamp(intensity * u.strength * color.w, 0, 1);
  // Premultiplied alpha — pipeline target uses premultiplied blending.
  return d.vec4f(std.mul(rgb, alpha), alpha);
});
