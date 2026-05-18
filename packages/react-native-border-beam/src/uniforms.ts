import type { Mode, ModeDefaults } from './types';

// Uniform layout used to live here as a hand-packed Float32Array. Since the
// TypeGPU migration, the struct is declared in `shader.ts` as `BeamUniforms`
// and TypeGPU handles byte layout + per-frame writes itself.

export const MODE_DEFAULTS: Record<Mode, ModeDefaults> = {
  // Diffuse glow. No stroke contribution; the visible effect is the colored interior
  // haze + outer bloom. Bloom radius is ~18% of the element's smaller half-dimension.
  aura: {
    strokeWidthFactor: 0,
    bloomRadiusFactor: 0.18,
    innerGlow: 0.5,
    strokeIntensity: 0,
  },
  // Comet beam tracing the border. Dominated by a sharp stroke; interior haze is
  // kept low so the border line is the visual emphasis.
  line: {
    strokeWidthFactor: 0.025,
    bloomRadiusFactor: 0.10,
    innerGlow: 0.05,
    strokeIntensity: 1.4,
  },
};

/** Minimum bloom radius in DP. Below this the off-screen halo collapses and the
 * canvas overhang vanishes on very small content. Shared between the component
 * (canvas overhang) and the renderer (shader uniform). */
export const MIN_BLOOM_PX = 6;

/** Helper used by both the renderer and the component: derive the absolute pixel
 * values (stroke width, bloom radius) for a given mode + scale + measured content
 * size. Both sizes scale with the element's smaller half-dimension so the effect
 * looks proportional regardless of element size. Bloom radius is floored at
 * `MIN_BLOOM_PX` so the off-screen halo stays visible on tiny elements. */
export function resolveModeSizes(
  defaults: ModeDefaults,
  contentSize: { width: number; height: number },
  scale: number,
): { strokeWidth: number; bloomRadius: number } {
  const minHalfDim = Math.min(contentSize.width, contentSize.height) / 2;
  return {
    strokeWidth: defaults.strokeWidthFactor * minHalfDim * scale,
    bloomRadius: Math.max(defaults.bloomRadiusFactor * minHalfDim * scale, MIN_BLOOM_PX),
  };
}
