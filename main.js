// ChatHel · sito per i direttori: piccoli comportamenti, il sito funziona anche senza.
(function () {
  // ombra della testata dopo lo scorrimento
  var bar = document.querySelector('.topbar');
  var onScroll = function () { bar.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // schede del pannello (tablist accessibile con frecce)
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.panel-tabs [role="tab"]'));
  var pane = document.getElementById('pane');
  var img = document.getElementById('pane-img');
  var turn = 0;
  function select(tab, focus) {
    if (tab.getAttribute('aria-selected') === 'true') return;
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    pane.setAttribute('aria-labelledby', tab.id);
    var ticket = ++turn;
    img.classList.add('fading');
    var next = new Image();
    next.onload = next.onerror = function () {
      if (ticket !== turn) return; // nel frattempo e' stata scelta un'altra scheda
      img.src = tab.dataset.img; img.alt = tab.dataset.alt;
      setTimeout(function () { if (ticket === turn) img.classList.remove('fading'); }, 30);
    };
    next.src = tab.dataset.img;
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      else if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
      else if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  // precarica le altre schermate del pannello
  window.addEventListener('load', function () { tabs.forEach(function (t) { new Image().src = t.dataset.img; }); });

  // chat dimostrativa: "Traduci" mostra il messaggio in italiano, "Mostra originale" lo riporta com'era
  Array.prototype.forEach.call(document.querySelectorAll('.msg[data-tr]'), function (msg) {
    var btn = msg.querySelector('.tr-btn');
    var text = msg.querySelector('.bubble p');
    var bubble = msg.querySelector('.bubble');
    var original = text.textContent;
    var originalLang = text.getAttribute('lang');
    var note = document.createElement('span');
    note.className = 'tr-note';
    note.textContent = 'Tradotto dal ' + msg.dataset.from;
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      text.textContent = on ? msg.dataset.tr : original;
      text.setAttribute('lang', on ? 'it' : originalLang);
      if (on) bubble.insertBefore(note, text.nextSibling); else if (note.parentNode) note.parentNode.removeChild(note);
      msg.classList.toggle('translated', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? 'Mostra originale' : 'Traduci';
    });
  });

  // comparsa morbida delle sezioni
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var els = document.querySelectorAll('.section-head, .step, .feature, .shot, .split-text, .split-media, .langs, .browser, .panel-item, .plan, .founding');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(els, function (el) { el.classList.add('reveal'); io.observe(el); });
  }
})();
