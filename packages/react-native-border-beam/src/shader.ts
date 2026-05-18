// Raw WGSL is used here (rather than TypeGPU `'use gpu'` fragment fns) because the
// shader does non-trivial control flow (perimeter classification across edges/corners)
// where WGSL is unambiguous and well-documented. CPU-side uniform layout is still
// tracked in `uniforms.ts`. A future revision can migrate to TypeGPU-authored shaders.
export const BEAM_SHADER_WGSL = /* wgsl */ `
struct BeamUniforms {
  resolution: vec2<f32>,
  innerSize:  vec2<f32>,
  radius:     f32,
  strokeWidth:f32,
  bloomRadius:f32,
  innerGlow:  f32,
  time:       f32,
  duration:   f32,
  strength:   f32,
  brightness: f32,
  saturation: f32,
  colorCount:      u32,
  strokeIntensity: f32,
  _pad:            f32,
  colors:          array<vec4<f32>, 8>,
};

@group(0) @binding(0) var<uniform> u: BeamUniforms;

struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOut {
  // Full-screen triangle (covers viewport with a single 3-vertex triangle).
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 3.0,  1.0),
  );
  let p = positions[idx];
  var out: VertexOut;
  out.position = vec4<f32>(p, 0.0, 1.0);
  // UV in [0,1] range, y flipped so (0,0) is top-left of the canvas.
  out.uv = vec2<f32>((p.x + 1.0) * 0.5, 1.0 - (p.y + 1.0) * 0.5);
  return out;
}

fn sdRoundBox(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
  let q = abs(p) - b + vec2<f32>(r);
  return min(max(q.x, q.y), 0.0) + length(max(q, vec2<f32>(0.0))) - r;
}

// Map a pixel position p (centered on the inner rect) to a smooth, cyclic
// coordinate s in [0,1), starting from the top-center and increasing clockwise.
// We use the angle from the rect's center — the same mapping CSS's conic-gradient
// uses. An earlier arc-length variant produced visible 45-degree Voronoi seams at
// each corner because the nearest-border projection switched discontinuously
// across those diagonals; the angle-based version is continuous everywhere.
fn perimeterCoord(p: vec2<f32>) -> f32 {
  // With uv y growing downward: top is at angle -pi/2, right at 0, bottom at pi/2,
  // left at +/-pi. Shift so top maps to 0, then divide by 2*pi.
  let angle = atan2(p.y, p.x);
  return fract((angle + 1.5707963) / 6.2831853 + 1.0);
}

fn sampleGradient(s: f32, count: u32) -> vec4<f32> {
  if (count == 0u) {
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
  }
  if (count == 1u) {
    return u.colors[0];
  }
  let n = f32(count);
  let pos = s * n;
  let lo = u32(floor(pos)) % count;
  let hi = (lo + 1u) % count;
  let t = fract(pos);
  return mix(u.colors[lo], u.colors[hi], t);
}

fn adjustSaturation(rgb: vec3<f32>, sat: f32) -> vec3<f32> {
  let l = dot(rgb, vec3<f32>(0.299, 0.587, 0.114));
  return mix(vec3<f32>(l), rgb, sat);
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4<f32> {
  // Pixel coords centered on the canvas, with y growing downward to match uv flip.
  let pix = (in.uv - vec2<f32>(0.5, 0.5)) * u.resolution;
  let halfInner = u.innerSize * 0.5;

  let dist = sdRoundBox(pix, halfInner, u.radius);
  let s = perimeterCoord(pix);

  let safeDuration = max(u.duration, 0.0001);
  let head = fract(u.time / safeDuration);

  // Color: sample the palette at a rotated, slightly-wobbling phase so the gradient
  // drifts around the rect over time independently of the brightness sweep. Without
  // this drift the colors stay anchored to fixed angular positions and the effect
  // looks statically tied to the rect's geometry. The drift rate is intentionally
  // not a simple fraction of the head's rate so colors and head never realign.
  let cycles = u.time / safeDuration;
  let colorDrift = cycles * 0.45 + 0.07 * sin(cycles * 1.7);
  let rotatedS = fract(s - colorDrift + 1.0);
  let color = sampleGradient(rotatedS, u.colorCount);

  // Wide, feathered tangential sweep mimicking the original conic mask. Sigma 0.22
  // gives a visible arc of ~44% of the perimeter with soft ramps on both sides.
  let tailDist = fract(head - s + 1.0);
  let symDist = min(tailDist, 1.0 - tailDist);
  let tanFade = exp(-pow(symDist / 0.22, 2.0));

  // Inside fade uses RADIAL distance from the rect's centre, normalised by halfInner —
  // so its iso-contours are ellipses matching the rect's aspect ratio, NOT parallel
  // offsets of the rounded rect's border. That eliminates the "hyperbolic rectangle"
  // shadow that an SDF-based fade would draw inside the bright halo (an inset rounded
  // rect ghost). For the outside halo we still use the SDF-based fade because the
  // outer bloom genuinely follows the border's shape.
  let safeHalf = max(halfInner, vec2<f32>(1.0));
  let ellipticalDist = length(pix / safeHalf);  // 0 at centre, 1 at border midpoints
  let innerFade = 1.0 - exp(-pow(ellipticalDist * 1.4, 2.0));

  let outwardReach = max(u.bloomRadius, 6.0);
  let outerDist = max(dist, 0.0);
  let isInside = select(0.0, 1.0, dist <= 0.0);
  let perpFade = innerFade * isInside
               + exp(-pow(outerDist / outwardReach, 2.0)) * (1.0 - isInside);

  // Glass haze: soft interior tint scaled by innerGlow.
  let glass = tanFade * perpFade * u.innerGlow * 0.55;

  // On-border stroke (line preset only — strokeIntensity is 0 for sm/md). A sharper
  // gaussian band centred on the perimeter, modulated by the same rotating tanFade so
  // the line is a moving colored beam tracing the border.
  let strokeBand = max(u.strokeWidth * 4.0, 3.0);
  let strokeFade = exp(-pow(abs(dist) / strokeBand, 2.0));
  let stroke = strokeFade * tanFade * u.strokeIntensity;

  let intensity = clamp((glass + stroke) * u.brightness, 0.0, 1.5);

  var rgb = color.rgb * intensity;
  rgb = adjustSaturation(rgb, u.saturation);
  let alpha = clamp(intensity * u.strength * color.a, 0.0, 1.0);
  // Premultiplied alpha — pipeline color target uses premultiplied blending.
  return vec4<f32>(rgb * alpha, alpha);
}
`;
