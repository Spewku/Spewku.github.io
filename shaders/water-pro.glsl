#ifdef GL_ES
precision mediump float;
#endif

uniform float u_time;
uniform vec2  u_resolution;
uniform float u_scroll;
uniform vec4  u_click;

// ── Simplex noise ──
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
  float a = 0.45;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p = rot * p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.08;

  // Gentle vertical drift from scroll
  float scrollShift = u_scroll * 2.0;

  // Two-layer wave displacement — clean and calm
  float wave1 = snoise(vec2(uv.x * 2.5, uv.y * 1.8 + t + scrollShift)) * 0.08;
  float wave2 = snoise(vec2(uv.x * 5.0 + 1.7, uv.y * 3.0 + t * 0.6 + scrollShift)) * 0.04;
  vec2 warped = uv + vec2(wave1, wave2);

  // Smooth FBM for depth layers
  float depth = fbm(warped * 2.0 + vec2(t * 0.3, scrollShift));

  // Click ripple — subtle expanding ring
  float clickDist = distance(uv, u_click.xy);
  float clickAge  = u_click.z;
  float ripple = 0.0;
  if (clickAge < 2.0) {
    float radius = clickAge * 0.5;
    float ring   = abs(clickDist - radius);
    ripple = exp(-ring * 14.0) * exp(-clickAge * 3.0) * 0.2;
  }

  // ── Color: clean, deep navy with subtle blue variation ──
  vec3 base     = vec3(0.012, 0.022, 0.052);
  vec3 mid      = vec3(0.018, 0.038, 0.085);
  vec3 surface  = vec3(0.028, 0.065, 0.14);
  vec3 accent   = vec3(0.06,  0.14,  0.26);

  vec3 col = base;
  col = mix(col, mid,     clamp(depth * 0.8 + 0.4, 0.0, 1.0));
  col = mix(col, surface, clamp(wave1 * 4.0 + 0.5, 0.0, 1.0));
  col = mix(col, accent,  clamp(wave2 * 6.0 + 0.3, 0.0, 1.0));

  // Subtle highlight band near the top third
  float band = smoothstep(0.55, 0.75, uv.y) * smoothstep(0.95, 0.75, uv.y);
  col += vec3(0.015, 0.035, 0.07) * band * (0.5 + depth * 0.5);

  // Click ripple tint
  col += vec3(0.08, 0.18, 0.32) * ripple;

  // Clean vignette
  float vig = 1.0 - 0.25 * length((uv - 0.5) * 1.4);
  col *= vig;

  gl_FragColor = vec4(col, 1.0);
}
