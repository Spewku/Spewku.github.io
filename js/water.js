/**
 * p5.js water background renderer.
 * Single large noise texture per layer, scrolled via source offset — no tile edges.
 */
(function () {
  var target = document.getElementById('waterBg');
  if (!target) return;

  var scrollVal = 0;
  var scrollTarget = 0;

  window.addEventListener('scroll', function () {
    scrollTarget = window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1);
  }, { passive: true });

  var sketch = function (p) {
    var w, h;
    var layers = [];

    function generateNoiseTexture(p, tw, th, scale, seed) {
      var c = document.createElement('canvas');
      c.width = tw;
      c.height = th;
      var ctx = c.getContext('2d');
      var img = ctx.createImageData(tw, th);
      var d = img.data;
      p.noiseSeed(seed);
      for (var y = 0; y < th; y++) {
        for (var x = 0; x < tw; x++) {
          var n = p.noise(x * scale, y * scale);
          var bright = n * 255;
          var idx = 4 * (y * tw + x);
          d[idx]     = 2 + bright * 0.04;
          d[idx + 1] = 5 + bright * 0.12;
          d[idx + 2] = 14 + bright * 0.28;
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return c;
    }

    p.setup = function () {
      w = window.innerWidth;
      h = window.innerHeight;
      p.createCanvas(w, h);
      p.pixelDensity(1);
      p.noLoop();

      var texW = w + 256;
      var texH = h + 256;
      layers = [
        { tex: generateNoiseTexture(p, texW, texH, 0.008, 1), speed: 0.4, alpha: 0.5 },
        { tex: generateNoiseTexture(p, texW, texH, 0.015, 2), speed: 0.7, alpha: 0.35 },
        { tex: generateNoiseTexture(p, texW, texH, 0.03, 3), speed: 1.0, alpha: 0.2 }
      ];

      p.draw();
    };

    p.draw = function () {
      scrollVal += (scrollTarget - scrollVal) * 0.04;

      var ctx = p.drawingContext;
      ctx.imageSmoothingEnabled = true;

      ctx.fillStyle = '#02050e';
      ctx.fillRect(0, 0, w, h);

      for (var i = 0; i < layers.length; i++) {
        var L = layers[i];
        var tex = L.tex;
        var tw = tex.width;
        var th = tex.height;
        var offsetX = (scrollVal * L.speed * 100) % tw;
        var offsetY = (scrollVal * L.speed * 200) % th;

        ctx.globalAlpha = L.alpha;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(tex, offsetX, offsetY, w, h, 0, 0, w, h);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      requestAnimationFrame(function () { p.draw(); });
    };

    p.windowResized = function () {
      w = window.innerWidth;
      h = window.innerHeight;
      p.resizeCanvas(w, h);
      var texW = w + 256;
      var texH = h + 256;
      for (var i = 0; i < layers.length; i++) {
        var scales = [0.008, 0.015, 0.03];
        var seeds = [1, 2, 3];
        layers[i].tex = generateNoiseTexture(p, texW, texH, scales[i], seeds[i]);
      }
    };
  };

  new p5(sketch, target);
})();
