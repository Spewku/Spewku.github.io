/**
 * Page transition loader.
 * Shows a dark overlay while the page loads and keeps it up until the
 * water background has drawn its first frame, so nothing white ever shows.
 * Fades it out once the new page DOM is ready.
 */
(function () {
  var loader = document.getElementById('pageloader');
  if (!loader) return;

  var fromNav = sessionStorage.getItem('navLoading');
  if (fromNav) {
    sessionStorage.removeItem('navLoading');
    loader.style.pointerEvents = 'all';
  }

  var faded = false;
  var domReady = false;
  var waterReady = !document.getElementById('water');

  function fadeOut() {
    if (faded) return;
    faded = true;
    loader.style.opacity = '0';
    setTimeout(function () { loader.remove(); }, 400);
  }

  function tryFade() {
    if (waterReady && domReady) fadeOut();
  }

  window.addEventListener('waterready', function () {
    waterReady = true;
    tryFade();
  });

  document.addEventListener('DOMContentLoaded', function () {
    domReady = true;
    setTimeout(tryFade, 100);
  });

  // Safety net: never leave the loader up forever
  setTimeout(fadeOut, 5000);

  // Intercept nav link clicks to trigger loader on next page
  var navLinks = document.querySelectorAll('.top-nav-btn');
  for (var i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('click', function () {
      var href = this.getAttribute('href');
      if (href && href !== location.pathname) {
        sessionStorage.setItem('navLoading', '1');
      }
    });
  }
})();
