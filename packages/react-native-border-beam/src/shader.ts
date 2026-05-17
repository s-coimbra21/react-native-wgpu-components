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
  colorCount: u32,
  _pad:       vec2<f32>,
  colors:     array<vec4<f32>, 8>,
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

// Map a pixel position p (centered on the inner rect) to a normalized arc-length
// coordinate s in [0,1), starting from the top-center and moving clockwise. Works for
// both exterior and interior pixels: we project p onto the rounded-rect border first,
// then compute the arc length of the projected point. This avoids the prior bug where
// deep-interior pixels in each quadrant collapsed to a single constant s and produced
// visible rectangular blocks when the orbit's bright head swept past.
fn perimeterCoord(p: vec2<f32>, halfInner: vec2<f32>, r: f32) -> f32 {
  let innerHalfW = max(halfInner.x - r, 0.0);
  let innerHalfH = max(halfInner.y - r, 0.0);
  let straightW = innerHalfW * 2.0;
  let straightH = innerHalfH * 2.0;
  let corner = 1.5707963 * r;
  let perim = 2.0 * (straightW + straightH) + 4.0 * corner;
  let safePerim = max(perim, 0.0001);

  // Project p onto the rounded-rect border.
  let cornerCenterBox = vec2<f32>(innerHalfW, innerHalfH);
  let qClamp = clamp(p, -cornerCenterBox, cornerCenterBox);
  let delta = p - qClamp;
  let deltaLen = length(delta);
  var nearest: vec2<f32>;
  if (deltaLen < 0.0001) {
    // Deep interior — project to the closer of the 4 straight edges.
    let dxR = halfInner.x - p.x;
    let dxL = p.x + halfInner.x;
    let dyT = p.y + halfInner.y;
    let dyB = halfInner.y - p.y;
    if (min(dxR, dxL) < min(dyT, dyB)) {
      nearest = select(vec2<f32>(-halfInner.x, p.y), vec2<f32>(halfInner.x, p.y), dxR < dxL);
    } else {
      nearest = select(vec2<f32>(p.x, halfInner.y), vec2<f32>(p.x, -halfInner.y), dyT < dyB);
    }
  } else {
    nearest = qClamp + delta * (r / deltaLen);
  }

  let nax = abs(nearest.x);
  let nay = abs(nearest.y);
  let onTopOrBottom = nax <= innerHalfW + 0.001;
  let onLeftOrRight = nay <= innerHalfH + 0.001;
  var d: f32 = 0.0;

  if (onTopOrBottom && nearest.y < 0.0) {
    if (nearest.x >= 0.0) {
      d = nearest.x;
    } else {
      d = perim + nearest.x;
    }
  } else if (onLeftOrRight && nearest.x > 0.0) {
    d = innerHalfW + corner + (nearest.y + innerHalfH);
  } else if (onTopOrBottom && nearest.y > 0.0) {
    d = innerHalfW + corner + straightH + corner + (innerHalfW - nearest.x);
  } else if (onLeftOrRight && nearest.x < 0.0) {
    d = innerHalfW + corner + straightH + corner + straightW + corner + (innerHalfH - nearest.y);
  } else {
    // Corner arc.
    let sx = select(-1.0, 1.0, nearest.x >= 0.0);
    let sy = select(-1.0, 1.0, nearest.y >= 0.0);
    let cx = sx * innerHalfW;
    let cy = sy * innerHalfH;
    let theta = atan2(nearest.y - cy, nearest.x - cx);
    if (sx > 0.0 && sy < 0.0) {
      d = innerHalfW + corner * clamp((theta + 1.5707963) / 1.5707963, 0.0, 1.0);
    } else if (sx > 0.0 && sy > 0.0) {
      d = innerHalfW + corner + straightH + corner * clamp(theta / 1.5707963, 0.0, 1.0);
    } else if (sx < 0.0 && sy > 0.0) {
      d = innerHalfW + corner + straightH + corner + straightW + corner * clamp((theta - 1.5707963) / 1.5707963, 0.0, 1.0);
    } else {
      d = innerHalfW + corner + straightH + corner + straightW + corner + straightH + corner * clamp((theta + 3.14159265) / 1.5707963, 0.0, 1.0);
    }
  }

  return fract(d / safePerim);
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
  let s = perimeterCoord(pix, halfInner, u.radius);

  let safeDuration = max(u.duration, 0.0001);
  let head = fract(u.time / safeDuration);

  // Each color stop is an orbiting 2D point light on the rounded-rect border. Its
  // contribution to a pixel is a separable product of a *tangential* gaussian
  // (narrow, along the perimeter) and a *perpendicular* gaussian (broader, into the
  // interior and out into the bloom). Summing the weighted contributions gives the
  // "glass with internal lights" look — multiple distinct elliptical lobes that rotate
  // together as the head advances, with the interior gently illuminated between them.
  // Color comes from a STATIC palette anchored to the pixel's own perimeter coord.
  // The visible-brightness window (tanFade below) rotates with the head and reveals
  // different parts of the gradient over time — same construction as the original
  // border-beam, where a feathered conic mask rotates over a fixed color layer.
  let color = sampleGradient(s, u.colorCount);

  // Wide, feathered tangential sweep mimicking the original conic mask. Sigma 0.22 gives
  // a visible arc of ~44% of the perimeter with soft ramps on both sides — broad and soft,
  // not a comet point. The sweep rotates with head.
  let tailDist = fract(head - s + 1.0);
  let symDist = min(tailDist, 1.0 - tailDist);
  let tanFade = exp(-pow(symDist / 0.22, 2.0));

  // Soft perpendicular fade. Floor keeps small (sm/line) presets illuminated; ratio
  // drives the rect-size-relative depth on larger surfaces.
  let inwardReach = max(min(halfInner.x, halfInner.y) * 0.7, 32.0);
  let outwardReach = max(u.bloomRadius, 6.0);
  let intoInterior = max(-dist, 0.0);
  let outerDist = max(dist, 0.0);
  let isInside = select(0.0, 1.0, dist <= 0.0);
  let perpFade = exp(-pow(intoInterior / inwardReach, 2.0)) * isInside
               + exp(-pow(outerDist  / outwardReach, 2.0)) * (1.0 - isInside);

  // Smoky, low-intensity composition. No explicit rim — the original has effectively none.
  let intensity = tanFade * perpFade * u.innerGlow * u.brightness * 0.55;

  var rgb = color.rgb * intensity;
  rgb = adjustSaturation(rgb, u.saturation);
  let alpha = clamp(intensity * u.strength * color.a, 0.0, 1.0);
  // Premultiplied alpha — pipeline color target uses premultiplied blending.
  return vec4<f32>(rgb * alpha, alpha);
}
`;
