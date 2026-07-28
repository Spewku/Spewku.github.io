/**
 * Page transition loader.
 * Shows a dark overlay when navigating via top-nav links,
 * fades it out once the new page DOM is ready.
 */
(function () {
  var loader = document.getElementById('pageloader');
  if (!loader) return;

  function fadeOut() {
    loader.style.opacity = '0';
    setTimeout(function () { loader.remove(); }, 400);
  }

  var fromNav = sessionStorage.getItem('navLoading');
  if (fromNav) {
    sessionStorage.removeItem('navLoading');
    loader.style.pointerEvents = 'all';
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(fadeOut, 100);
    });
  } else {
    fadeOut();
  }

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
