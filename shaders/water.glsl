#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_scroll;    // 0..1 scroll progress
uniform vec4  u_click;     // (x, y, ageInSeconds, 0)

// ── Simplex noise ──────────────────────────────────
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                          + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p = rot * p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

// ── Main ───────────────────────────────────────────
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.15;

  // Scroll-driven vertical drift and turbulence boost
  float scrollShift = u_scroll * 3.0;
  float scrollIntensity = smoothstep(0.0, 0.3, u_scroll);

  // Click ripple — expands outward and fades over ~1.5 s
  float clickDist = distance(uv, u_click.xy);
  float clickAge  = u_click.z;
  float rippleStrength = 0.0;
  if (clickAge < 2.0) {
    float radius = clickAge * 0.6;                       // expanding ring
    float ring   = abs(clickDist - radius);              // distance from ring edge
    float falloff = exp(-ring * 12.0);                   // sharp ring
    float fade    = exp(-clickAge * 2.5);                // time decay
    rippleStrength = falloff * fade * 0.45;
  }

  // Distort UVs for water surface
  vec2 q = vec2(0.0);
  q.x = fbm(uv * 3.0 + vec2(0.0, t * 0.4 + scrollShift));
  q.y = fbm(uv * 3.0 + vec2(5.2, t * 0.3 + scrollShift * 0.7));

  vec2 r = vec2(0.0);
  r.x = fbm(uv * 3.0 + 4.0 * q + vec2(1.7, t * 0.2 + scrollShift));
  r.y = fbm(uv * 3.0 + 4.0 * q + vec2(8.2, t * 0.15 + scrollShift * 0.5));

  // Scroll adds turbulence by increasing the distortion scale
  float turb = 1.0 + scrollIntensity * 1.5;
  float f = fbm(uv * 3.0 * turb + 4.0 * r);

  // Click ripple warps the final noise input
  vec2 rippleOffset = normalize(uv - u_click.xy + 0.001) * rippleStrength;
  f += rippleOffset.x + rippleOffset.y;

  // ── Color palette ──
  vec3 deep      = vec3(0.008, 0.018, 0.055);
  vec3 mid       = vec3(0.015, 0.045, 0.11);
  vec3 surface   = vec3(0.03,  0.08,  0.18);
  vec3 foam      = vec3(0.08,  0.16,  0.28);
  vec3 highlight = vec3(0.12,  0.28,  0.45);
  vec3 rippleCol = vec3(0.18,  0.42,  0.65);

  vec3 col = deep;
  col = mix(col, mid,       clamp(f * f * 2.0, 0.0, 1.0));
  col = mix(col, surface,   clamp(length(q) * 1.2, 0.0, 1.0));
  col = mix(col, foam,      clamp(length(r.x) * 1.5, 0.0, 1.0));
  col = mix(col, highlight, clamp(f * 0.5 + 0.1, 0.0, 1.0) * 0.3);

  // Caustic highlights — intensified by scroll
  float caustic = snoise(uv * 8.0 + vec2(t * 0.6, t * 0.4 + scrollShift));
  caustic = pow(max(caustic, 0.0), 6.0);
  col += vec3(0.02, 0.06, 0.12) * caustic * (1.0 + scrollIntensity * 1.5);

  // Click ripple overlay
  col += rippleCol * rippleStrength;

  // Vignette — slightly tighter when scrolling
  float vig = 1.0 - (0.3 + scrollIntensity * 0.15) * length((uv - 0.5) * 1.5);
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
