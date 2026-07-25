/**
 * WebGL water shader renderer.
 * Loads a GLSL fragment shader from a URL and renders it fullscreen on a <canvas>.
 * Passes u_scroll and u_click uniforms for interactive effects.
 */
(function () {
  var canvas = document.getElementById('waterBg');
  if (!canvas) return;

  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    canvas.style.display = 'none';
    return;
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // Fullscreen quad
  var verts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  var vsSource = 'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}';

  function createShader(type, source) {
    var s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var vs = createShader(gl.VERTEX_SHADER, vsSource);
  if (!vs) return;

  var fs = null;
  var program = null;
  var uTime = null;
  var uRes = null;
  var uScroll = null;
  var uClick = null;

  // Interaction state — smooth values fed to the shader
  var scrollVal = 0;
  var scrollTarget = 0;
  var clickX = 0.5, clickY = 0.5;
  var clickAge = 999; // seconds since last click

  window.addEventListener('scroll', function () {
    scrollTarget = window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1);
  }, { passive: true });

  canvas.addEventListener('click', function (e) {
    clickX = e.clientX / window.innerWidth;
    clickY = 1.0 - e.clientY / window.innerHeight; // flip Y for GL coords
    clickAge = 0;
  });

  function buildProgram(fragSource) {
    if (program) gl.deleteProgram(program);
    fs = createShader(gl.FRAGMENT_SHADER, fragSource);
    if (!fs) return;

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      program = null;
      return;
    }

    gl.useProgram(program);
    uTime = gl.getUniformLocation(program, 'u_time');
    uRes = gl.getUniformLocation(program, 'u_resolution');
    uScroll = gl.getUniformLocation(program, 'u_scroll');
    uClick = gl.getUniformLocation(program, 'u_click');

    var posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  }

  // Read shader path from data attribute, default to water.glsl
  var shaderUrl = canvas.getAttribute('data-shader') || '/shaders/water.glsl';

  fetch(shaderUrl)
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    })
    .then(function (src) {
      buildProgram(src);
      if (!program) return;

      var startTime = performance.now();
      var lastFrame = startTime;

      function render(now) {
        var dt = (now - lastFrame) / 1000.0;
        lastFrame = now;
        var t = (now - startTime) / 1000.0;

        // Smooth scroll interpolation
        scrollVal += (scrollTarget - scrollVal) * Math.min(dt * 3.0, 1.0);

        // Age the click
        clickAge += dt;

        gl.uniform1f(uTime, t);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uScroll, scrollVal);
        gl.uniform4f(uClick, clickX, clickY, clickAge, 0.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
      }
      requestAnimationFrame(render);
    })
    .catch(function (e) {
      console.warn('Could not load water shader:', e);
      canvas.style.display = 'none';
    });
})();
