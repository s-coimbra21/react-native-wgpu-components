// Worklet-compatible JS implementations of the perimeter-coord math used in the
// shader, so the hover-gesture worklet can convert a 2D cursor position into the
// same `s` coordinate the shader uses for the brightness sweep.

/** Map a centred pixel position to a perimeter coord s ∈ [0,1) starting at
 * top-centre clockwise. Cross-language port of `perimeterCoord` in `shader.ts` —
 * keep in sync: any algorithmic change must be mirrored in `shader.ts:perimeterCoord`,
 * otherwise the cursor position and the shader's sweep will disagree. The two
 * safety floors below have different magnitudes on purpose:
 *  - `Math.max(halfInner.*, 1)` avoids division by zero on pre-layout (0×0) content.
 *  - `Math.max(abs(dir.*), 1e-4)` avoids tangent blow-up on axis-aligned rays. */
export function perimeterCoordJS(
  px: number,
  py: number,
  halfInnerX: number,
  halfInnerY: number,
): number {
  'worklet';
  const W = Math.max(halfInnerX, 1);
  const H = Math.max(halfInnerY, 1);
  const angle = Math.atan2(py, px);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const safeAbsX = Math.max(Math.abs(dx), 1e-4);
  const safeAbsY = Math.max(Math.abs(dy), 1e-4);
  const tx = W / safeAbsX;
  const ty = H / safeAbsY;
  const t = Math.min(tx, ty);
  const hitX = dx * t;
  const hitY = dy * t;
  const onVertical = tx < ty;
  const perim = 4 * (W + H);
  let arc = 0;
  if (onVertical) {
    if (hitX > 0) arc = W + (hitY + H);
    else arc = 3 * W + 2 * H + (H - hitY);
  } else if (hitY < 0) {
    if (hitX >= 0) arc = hitX;
    else arc = 3 * W + 4 * H + (hitX + W);
  } else {
    arc = W + 2 * H + (W - hitX);
  }
  const s = arc / Math.max(perim, 1e-4);
  return s - Math.floor(s);
}

/** Lerp on cyclic [0,1) values, taking the shorter direction. Used by the
 * renderer to blend the time-based auto-head with the cursor-driven head. */
export function lerpCyclic(a: number, b: number, t: number): number {
  'worklet';
  let diff = b - a;
  if (diff > 0.5) diff -= 1;
  else if (diff < -0.5) diff += 1;
  const r = a + diff * t;
  return r - Math.floor(r);
}
