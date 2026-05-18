// Perimeter math used to live here in two places (a worklet-safe JS port + the
// shader's WGSL copy). After the TypeGPU migration, `perimeterCoord` is a single
// `tgpu.fn` in `shader.ts` that runs on both the GPU and the JS thread — see the
// JS-thread call in `useBeamRenderer.frame()`.
//
// Only `lerpCyclic` remains here: it's CPU-only blending logic with no shader
// counterpart.

/** Lerp on cyclic [0,1) values, taking the shorter direction. Used by the
 * renderer to blend the time-based auto-head with the cursor-driven head. */
export function lerpCyclic(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 0.5) diff -= 1;
  else if (diff < -0.5) diff += 1;
  const r = a + diff * t;
  return r - Math.floor(r);
}
