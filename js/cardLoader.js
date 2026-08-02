/**
 * Card grid with visual + graphics culling.
 * Card containers stay in the DOM so the grid always keeps its full height and
 * the page can always scroll to the bottom. Cards far from the viewport are
 * culled visually (visibility: hidden — no paint, no layers, no pseudo-elements)
 * and their thumbnail graphics are unloaded. Two observers provide hysteresis:
 * loading starts only when a card enters a generous load buffer, and unloading
 * only happens once a card leaves a much larger buffer, so nothing churns near
 * the edge and work only happens when it is actually needed.
 */
(function () {
  var loadIO = null;
  var unloadIO = null;
  var targets = [];

  function loadMargin() {
    return Math.max(1200, Math.ceil(window.innerHeight * 1.5)) + 'px';
  }

  function unloadMargin() {
    return Math.max(2400, Math.ceil(window.innerHeight * 3)) + 'px';
  }

  function rebuildObservers() {
    if (loadIO) loadIO.disconnect();
    if (unloadIO) unloadIO.disconnect();

    loadIO = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) enterCard(entries[i].target);
      }
    }, { rootMargin: loadMargin() });

    unloadIO = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].isIntersecting) leaveCard(entries[i].target);
      }
    }, { rootMargin: unloadMargin() });

    for (var i = 0; i < targets.length; i++) {
      loadIO.observe(targets[i]);
      unloadIO.observe(targets[i]);
    }
  }

  var resizeTicking = false;
  window.addEventListener('resize', function () {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(function () {
      resizeTicking = false;
      rebuildObservers();
    });
  });

  function enterCard(card) {
    card.classList.remove('card--culled');
    loadCard(card);
  }

  function leaveCard(card) {
    card.classList.add('card--culled');
    unloadCard(card);
  }

  function loadCard(card) {
    if (card.dataset.state === 'loading' || card.dataset.state === 'loaded') return;
    var img = card.querySelector('.card-img');
    var thumb = card.dataset.thumb;
    if (!thumb || !img) {
      card.dataset.state = 'loaded';
      card.classList.add('card--loaded');
      return;
    }
    card.dataset.state = 'loading';
    card.classList.remove('card--loaded');
    card.classList.add('card--loading');
    function done() {
      if (card.dataset.state !== 'loading') return;
      card.dataset.state = 'loaded';
      card.classList.remove('card--loading');
      card.classList.add('card--loaded');
    }
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
    img.src = thumb;
  }

  function unloadCard(card) {
    if (card.dataset.state === 'idle') return;
    card.dataset.state = 'idle';
    card.classList.remove('card--loading', 'card--loaded');
    var img = card.querySelector('.card-img');
    if (img) img.removeAttribute('src');
  }

  function mount(grid, items, onClick) {
    if (!grid) return;

    var frag = document.createDocumentFragment();
    for (var i = 0; i < items.length; i++) {
      frag.appendChild(createCard(items[i]));
    }
    grid.appendChild(frag);

    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (card && card.dataset.post) onClick(card);
    });

    var cards = grid.querySelectorAll('.card');
    for (var j = 0; j < cards.length; j++) targets.push(cards[j]);

    if ('IntersectionObserver' in window) {
      if (!loadIO) {
        rebuildObservers();
      } else {
        for (var k = 0; k < cards.length; k++) {
          loadIO.observe(cards[k]);
          unloadIO.observe(cards[k]);
        }
      }
    } else {
      for (var l = 0; l < cards.length; l++) enterCard(cards[l]);
    }
  }

  function createCard(item) {
    var thumb = item.thumbnail || (item.images && item.images[0]) || '';
    var encoded = encodeURIComponent(JSON.stringify(item));
    var card = document.createElement('div');
    card.className = 'card card--culled';
    card.dataset.post = encoded;
    card.dataset.thumb = thumb;
    card.dataset.state = 'idle';
    card.innerHTML = '<div class="card-thumb"><div class="card-loader"></div><img class="card-img" alt="" decoding="async" /></div><span class="card-title"></span>';
    card.querySelector('.card-title').textContent = item.title;
    return card;
  }

  window.cardLoader = { mount: mount };
})();
