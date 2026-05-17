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
// coordinate s in [0,1), starting from the top-center and moving clockwise.
fn perimeterCoord(p: vec2<f32>, halfInner: vec2<f32>, r: f32) -> f32 {
  let innerHalfW = max(halfInner.x - r, 0.0);
  let innerHalfH = max(halfInner.y - r, 0.0);
  let straightW = innerHalfW * 2.0;
  let straightH = innerHalfH * 2.0;
  let corner = 1.5707963 * r;
  let perim = 2.0 * (straightW + straightH) + 4.0 * corner;
  let safePerim = max(perim, 0.0001);

  let ax = abs(p.x);
  let ay = abs(p.y);

  var d: f32 = 0.0;

  if (ay >= innerHalfH && ax <= innerHalfW && p.y < 0.0) {
    if (p.x >= 0.0) {
      d = p.x;
    } else {
      d = perim + p.x;
    }
  } else if (ax >= innerHalfW && ay <= innerHalfH && p.x > 0.0) {
    d = innerHalfW + corner + (p.y + innerHalfH);
  } else if (ay >= innerHalfH && ax <= innerHalfW && p.y > 0.0) {
    d = innerHalfW + corner + straightH + corner + (innerHalfW - p.x);
  } else if (ax >= innerHalfW && ay <= innerHalfH && p.x < 0.0) {
    d = innerHalfW + corner + straightH + corner + straightW + corner + (innerHalfH - p.y);
  } else {
    // Corner region.
    let sx = select(-1.0, 1.0, p.x >= 0.0);
    let sy = select(-1.0, 1.0, p.y >= 0.0);
    let cx = sx * innerHalfW;
    let cy = sy * innerHalfH;
    let dx = p.x - cx;
    let dy = p.y - cy;
    let theta = atan2(dy, dx);
    if (sx > 0.0 && sy < 0.0) {
      let t = (theta + 1.5707963) / 1.5707963;
      d = innerHalfW + corner * clamp(t, 0.0, 1.0);
    } else if (sx > 0.0 && sy > 0.0) {
      let t = theta / 1.5707963;
      d = innerHalfW + corner + straightH + corner * clamp(t, 0.0, 1.0);
    } else if (sx < 0.0 && sy > 0.0) {
      let t = (theta - 1.5707963) / 1.5707963;
      d = innerHalfW + corner + straightH + corner + straightW + corner * clamp(t, 0.0, 1.0);
    } else {
      let t = (theta + 3.14159265) / 1.5707963;
      d = innerHalfW + corner + straightH + corner + straightW + corner + straightH + corner * clamp(t, 0.0, 1.0);
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
  // tailDist measures forward-distance from the head to the current pixel along the
  // direction of motion. The head is at tailDist=0 (brightest); the tail trails behind
  // (lower s, which gives a small positive tailDist after the +1/fract wrap).
  let tailDist = fract(head - s + 1.0);
  let decay: f32 = 6.0;
  let orbit = exp(-decay * tailDist);

  let color = sampleGradient(s, u.colorCount);

  let stroke = smoothstep(max(u.strokeWidth, 0.001), 0.0, abs(dist)) * orbit * u.brightness;
  let innerBand = max(u.strokeWidth * 4.0, 0.001);
  // Inner glow peaks AT the border and fades inward across innerBand.
  // The inside-only mask prevents the smoothstep from also lighting exterior pixels.
  let intoInterior = max(-dist, 0.0);
  let isInside = select(0.0, 1.0, dist <= 0.0);
  let inner = (1.0 - smoothstep(0.0, innerBand, intoInterior)) * isInside * u.innerGlow * orbit;
  // Bloom is the outside-only halo. Without the isOutside mask, interior pixels with
  // dist<0 would get max(dist,0)=0 and bloom=exp(0)=1, lighting the whole inside.
  let isOutside = select(0.0, 1.0, dist > 0.0);
  let bloom = exp(-pow(max(dist, 0.0) / max(u.bloomRadius, 0.0001), 2.0)) * isOutside * orbit * 0.8;

  let intensity = stroke + inner + bloom;
  var rgb = color.rgb * intensity;
  rgb = adjustSaturation(rgb, u.saturation);
  let alpha = clamp(intensity * u.strength * color.a, 0.0, 1.0);
  // Premultiplied alpha — pipeline color target uses premultiplied blending.
  return vec4<f32>(rgb * alpha, alpha);
}
`;
