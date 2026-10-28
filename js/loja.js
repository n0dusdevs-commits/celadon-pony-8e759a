/* May Modas — site da loja (catálogo, sacola e pedido via WhatsApp, dados no Supabase) */
(function () {
  'use strict';
  var sb = MM.sb, brl = MM.brl, esc = MM.esc, digits = MM.digits;
  var S = Object.assign({}, MM.DEFAULTS), PRODUCTS = [];

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var A = (window.anime && !REDUCED) ? window.anime : null;
  function icon(id) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  function logoSrc() { return S.logo ? MM.img(S.logo) : 'assets/logo.webp'; }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function instOn() { return S.installments_enabled !== false; }
  function encOn() { return S.encomenda_enabled !== false; }
  function isEnc(p) { return (p.availability || 'pronta') === 'encomenda'; }
  function minEnc() { return Number(S.encomenda_min_cents) || 0; }
  function encNoteText() {
    return (S.encomenda_note || '') + (S.encomenda_prazo ? ' Prazo estimado: ' + S.encomenda_prazo + '.' : '') +
      (minEnc() ? ' Pedido mínimo de ' + brl(minEnc()) + ' em peças sob encomenda (pode somar várias peças).' : '');
  }
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function phHTML() { return '<div class="ph"><img src="' + logoSrc() + '" alt=""></div>'; }

  /* ---------------- Conteúdo da loja ---------------- */
  function applySettings() {
    document.title = S.store_name + ' | ' + S.tagline;
    var logo = '<img src="' + logoSrc() + '" alt="' + esc(S.store_name) + '">';
    $('#brand').innerHTML = logo;
    $('#heroLogo').innerHTML = '<img class="hero-logo" src="' + logoSrc() + '" alt="">';
    $('#footLogo').innerHTML = logo;
    $('#heroEyebrow').textContent = S.tagline;
    $('#footTag').textContent = S.tagline + '.';
    $('#footName').textContent = S.store_name;
    $('#phoneName').textContent = 'Pedido ' + S.store_name;
    var words = String(S.hero_title || '').trim().split(/\s+/);
    $('#heroTitle').innerHTML = words.map(function (w, i) { return '<span class="w' + (i === words.length - 1 ? ' gold' : '') + '">' + esc(w) + '</span>'; }).join(' ');
    $('#heroSub').textContent = S.hero_subtitle;
    $('#aboutTitle').textContent = S.about_title;
    $('#aboutText').textContent = S.about_text;
    if (S.announcement) { $('#announce').textContent = S.announcement; $('#announce').hidden = false; }
    if (instOn()) {
      if (S.installments_note) $('#cardInstText').textContent = 'O parcelamento é feito direto com a lojista. ' + S.installments_note;
    } else {
      ['#badgeInstLi', '#cardInst', '#faqInstItem'].forEach(function (s) { $(s).hidden = true; });
      $('#howPay').textContent = 'PIX ou dinheiro, combinado direto com a lojista.';
      $('#phonePay').innerHTML = 'Pagamento: <strong>PIX</strong>';
      $('#faqPay').textContent = 'PIX ou dinheiro. Você escolhe na hora de finalizar e a lojista confirma os detalhes com você.';
    }
    var info = [], wa = digits(S.whatsapp);
    if (wa) info.push('<li>' + icon('whatsapp') + '<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener">' + MM.formatPhone(wa) + '</a></li>');
    if (S.instagram) info.push('<li>' + icon('instagram') + '<a href="https://instagram.com/' + encodeURIComponent(S.instagram) + '" target="_blank" rel="noopener">@' + esc(S.instagram) + '</a></li>');
    if (S.address) info.push('<li>' + icon('pin') + '<span>' + esc(S.address) + '<br><a href="https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(S.address) + '" target="_blank" rel="noopener">Como chegar</a></span></li>');
    if (S.hours) info.push('<li>' + icon('clock') + '<span class="pre">' + esc(S.hours) + '</span></li>');
    $('#info').innerHTML = info.join('');
    var social = [];
    if (wa) social.push('<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + icon('whatsapp') + '</a>');
    if (S.instagram) social.push('<a href="https://instagram.com/' + encodeURIComponent(S.instagram) + '" target="_blank" rel="noopener" aria-label="Instagram">' + icon('instagram') + '</a>');
    $('#footSocial').innerHTML = social.join('');
    $('#year').textContent = new Date().getFullYear();
    var hasEnc = encOn() && PRODUCTS.some(isEnc), hasPronta = PRODUCTS.some(function (p) { return !isEnc(p); });
    $('#kindTabs').hidden = !(hasEnc && hasPronta);
    $('#kindEncSub').textContent = minEnc() ? 'Mais barato · mín. ' + brl(minEnc()) : 'Mais barato';
    $('#faqEncItem').hidden = !hasEnc;
    $('#faqEnc').textContent = 'São peças que a lojista busca direto no fornecedor depois do seu pedido, por isso o preço é menor. ' + encNoteText() + ' Pagamento em PIX, dinheiro ou cartão parcelado.';
    var cats = {}; PRODUCTS.forEach(function (p) { cats[p.category] = 1; });
    $('#cntProducts').setAttribute('data-count', PRODUCTS.length);
    $('#cntCats').setAttribute('data-count', Object.keys(cats).length);
  }

  /* ---------------- Header, menu ---------------- */
  var header = $('#header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var menuBtn = $('#menuBtn'), nav = $('#nav');
  function setMenu(open) { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.innerHTML = icon(open ? 'x' : 'menu'); }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });

  /* ---------------- Animações ---------------- */
  function heroIntro() {
    if (!A) return;
    $$('.hero-title .w, [data-hero], #heroLogo, #logoStage').forEach(function (el) { el.style.opacity = 0; });
    A.timeline({ easing: 'easeOutExpo' })
      .add({ targets: '#logoStage', scale: [0.85, 1], opacity: [0, 1], duration: 1100 })
      .add({ targets: '.ring-path', strokeDashoffset: [A.setDashoffset, 0], duration: 1600, easing: 'easeInOutSine', delay: A.stagger(200) }, 0)
      .add({ targets: '#heroLogo', opacity: [0, 1], translateY: [20, 0], duration: 1000 }, 300)
      .add({ targets: '.hero-title .w', opacity: [0, 1], translateY: ['0.6em', 0], rotateX: [-60, 0], duration: 900, delay: A.stagger(70) }, 150)
      .add({ targets: '[data-hero]', opacity: [0, 1], translateY: [16, 0], duration: 800, delay: A.stagger(90) }, '-=650');
    A({ targets: '.ring', rotate: 360, duration: 60000, easing: 'linear', loop: true });
  }
  if (A) $$('[data-hero], #heroLogo, #logoStage, #heroTitle').forEach(function (el) { el.style.opacity = 0; });
  if (!REDUCED) {
    var orbs = $$('.orb'), ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { var y = Math.min(window.scrollY, 900); orbs[0].style.transform = 'translate3d(0,' + (y * 0.18) + 'px,0)'; orbs[1].style.transform = 'translate3d(0,' + (y * -0.12) + 'px,0)'; ticking = false; });
    }, { passive: true });
  }
  if (A && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal-on');
    var revealIO = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      if (!batch.length) return;
      batch.forEach(function (el) { revealIO.unobserve(el); });
      A({ targets: batch, opacity: [0, 1], translateY: [28, 0], duration: 900, easing: 'easeOutCubic', delay: A.stagger(90) });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(function (el) { revealIO.observe(el); });
  }
  if (!REDUCED && window.matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach(function (card) {
      card.addEventListener('pointermove', function (e) { var r = card.getBoundingClientRect(); var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; card.style.transform = 'perspective(900px) rotateX(' + (-y * 8).toFixed(2) + 'deg) rotateY(' + (x * 10).toFixed(2) + 'deg) translateY(-4px)'; });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }
  function runCounters() {
    var els = $$('[data-count]');
    function go() { els.forEach(function (el) { var end = Number(el.getAttribute('data-count')) || 0; if (!A) { el.textContent = end; return; } var o = { v: 0 }; A({ targets: o, v: end, round: 1, duration: 1600, easing: 'easeOutExpo', update: function () { el.textContent = o.v; } }); }); }
    if (!('IntersectionObserver' in window)) return go();
    var io = new IntersectionObserver(function (en) { if (en.some(function (e) { return e.isIntersecting; })) { io.disconnect(); go(); } }, { threshold: 0.3 });
    io.observe($('#counters'));
  }
  function setupHow() {
    var steps = $$('.step'), bubbles = $$('.bubble'), bar = $('#howBar'), current = -1;
    function activate(i) {
      if (i <= current) return; current = i;
      steps.forEach(function (s, k) { s.classList.toggle('active', k <= i); });
      bubbles.forEach(function (b, k) { b.classList.toggle('show', k <= i); });
      bar.style.transform = 'scaleX(' + ((i + 1) / steps.length) + ')';
      if (A) A({ targets: steps[i].querySelector('.step-n'), scale: [0.7, 1], duration: 600, easing: 'easeOutBack' });
    }
    if (REDUCED || !('IntersectionObserver' in window)) return activate(steps.length - 1);
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) activate(Number(e.target.getAttribute('data-step'))); }); }, { rootMargin: '-40% 0px -40% 0px' });
    steps.forEach(function (s) { io.observe(s); });
    window.addEventListener('scroll', function () { if ($('#como-funciona').getBoundingClientRect().bottom < innerHeight * 0.55) activate(steps.length - 1); }, { passive: true });
  }
  $$('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (!open) { panel.hidden = false; if (A) A({ targets: panel, opacity: [0, 1], translateY: [-6, 0], duration: 380, easing: 'easeOutCubic' }); }
      else panel.hidden = true;
    });
  });

  /* ---------------- Catálogo ---------------- */
  var filter = { gender: '', cat: '', q: '', kind: '' };
  function priceOf(p) { return (p.promo_cents && p.promo_cents < p.price_cents) ? p.promo_cents : p.price_cents; }
  function noPrice(p) { return p.price_cents == null; }
  function askLink(p, size) { var wa = digits(S.whatsapp); return wa ? 'https://wa.me/' + wa + '?text=' + encodeURIComponent('Olá! Quero saber o valor desta peça: ' + p.name + (size ? ' (tam. ' + size + ')' : (p.sizes && p.sizes.length ? ' (tam. ' + p.sizes.join('/') + ')' : '')) + ' - ' + location.origin + location.pathname + '#p-' + p.id) : '#contato'; }
  function instLine() { return instOn() ? '<span class="inst">Parcelamento sem cartão com a lojista</span>' : ''; }
  function renderCats() {
    var cats = []; PRODUCTS.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });
    cats.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    $('#catChips').innerHTML = cats.length > 1 ? ['<button type="button" class="chip on" data-cat="">Tudo</button>'].concat(cats.map(function (c) { return '<button type="button" class="chip" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; })).join('') : '';
  }
  function filtered() {
    var qq = filter.q.trim().toLowerCase();
    return PRODUCTS.filter(function (p) {
      return (!filter.gender || p.gender === filter.gender || (filter.gender !== 'unissex' && p.gender === 'unissex')) &&
        (!filter.cat || p.category === filter.cat) &&
        (!filter.kind || (p.availability || 'pronta') === filter.kind) &&
        (!qq || (p.name + ' ' + p.category + ' ' + (p.description || '')).toLowerCase().indexOf(qq) >= 0);
    });
  }
  function cardHTML(p) {
    var img = p.images && p.images[0] ? '<img src="' + MM.img(p.images[0]) + '" alt="' + esc(p.name) + '" loading="lazy">' : phHTML();
    var enc = isEnc(p), soldOut = !enc && p.stock === 0, promo = p.promo_cents && p.promo_cents < p.price_cents;
    var tag = soldOut ? '<span class="tag">Esgotado</span>' : promo ? '<span class="tag sale">-' + Math.round(100 - p.promo_cents / p.price_cents * 100) + '%</span>' : p.featured ? '<span class="tag">Destaque</span>' : '';
    if (enc) tag += '<span class="tag enc">Sob encomenda</span>';
    if (noPrice(p)) {
      return '<article class="prod" id="p-' + esc(p.id) + '"><button type="button" class="prod-media" data-open="' + esc(p.id) + '" aria-label="Ver ' + esc(p.name) + '">' + img + tag + '</button>' +
        '<div class="prod-info">' + (enc ? '<span class="kind-line enc">Sob encomenda</span>' : '') + '<span class="prod-cat">' + esc(p.category) + '</span><h3 class="prod-name">' + esc(p.name) + (p.sizes && p.sizes.length ? ' · ' + esc(p.sizes.join('/')) : '') + '</h3>' +
        '<div class="price"><strong class="ask">Preço sob consulta</strong></div>' +
        '<a class="btn btn-dark btn-block prod-add" href="' + esc(askLink(p)) + '" target="_blank" rel="noopener">' + icon('whatsapp') + ' Consultar valor</a></div></article>';
    }
    return '<article class="prod"><button type="button" class="prod-media" data-open="' + esc(p.id) + '" aria-label="Ver ' + esc(p.name) + '">' + img + tag + '</button>' +
      '<div class="prod-info">' + (enc ? '<span class="kind-line enc">Sob encomenda</span>' : '') + '<span class="prod-cat">' + esc(p.category) + '</span><h3 class="prod-name">' + esc(p.name) + '</h3>' +
      '<div class="price">' + (promo ? '<s>' + brl(p.price_cents) + '</s>' : '') + '<strong>' + brl(priceOf(p)) + '</strong></div>' +
      (enc ? '<span class="inst">' + (minEnc() ? 'Mín. ' + brl(minEnc()) + ' em encomendas' : 'Cartão parcelado') + '</span>' : instLine()) +
      '<button type="button" class="btn btn-dark btn-block prod-add" data-open="' + esc(p.id) + '"' + (soldOut ? ' disabled' : '') + '>' + (soldOut ? 'Esgotado' : 'Escolher') + '</button></div></article>';
  }
  function renderGrid(animate, msg) {
    var grid = $('#grid'), list = filtered();
    function draw() {
      grid.innerHTML = list.map(cardHTML).join('');
      var empty = $('#empty');
      if (msg) { empty.textContent = msg; empty.hidden = false; }
      else if (!PRODUCTS.length) { empty.textContent = 'Em breve novidades por aqui. A vitrine está sendo montada com carinho.'; empty.hidden = false; }
      else if (!list.length) { empty.textContent = 'Nenhuma peça encontrada com esses filtros.'; empty.hidden = false; }
      else empty.hidden = true;
      if (A && animate) A({ targets: '#grid .prod', opacity: [0, 1], translateY: [24, 0], scale: [0.97, 1], duration: 600, delay: A.stagger(45), easing: 'easeOutCubic' });
    }
    if (A && animate && grid.children.length) A({ targets: '#grid .prod', opacity: 0, translateY: 10, duration: 180, easing: 'easeInQuad', complete: draw });
    else draw();
  }
  function setChip(wrap, btn) { $$('.chip', wrap).forEach(function (c) { c.classList.toggle('on', c === btn); }); }
  $('#genderChips').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; setChip($('#genderChips'), b); filter.gender = b.getAttribute('data-gender'); renderGrid(true); });
  $('#catChips').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; setChip($('#catChips'), b); filter.cat = b.getAttribute('data-cat'); renderGrid(true); });
  $('#kindTabs').addEventListener('click', function (e) {
    var b = e.target.closest('.kind'); if (!b) return;
    $$('.kind', $('#kindTabs')).forEach(function (c) { c.classList.toggle('on', c === b); });
    filter.kind = b.getAttribute('data-kind');
    var n = $('#encNote'); n.hidden = filter.kind !== 'encomenda'; n.textContent = encNoteText();
    renderGrid(true);
  });
  var qT; $('#q').addEventListener('input', function (e) { clearTimeout(qT); qT = setTimeout(function () { filter.q = e.target.value; renderGrid(true); }, 200); });
  $('#grid').addEventListener('click', function (e) { var b = e.target.closest('[data-open]'); if (b && !b.disabled) openProduct(b.getAttribute('data-open')); });

  /* ---------------- Produto ---------------- */
  var pmDialog = $('#productModal');
  function findP(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
  function optGroup(name, label, values) {
    if (!values || !values.length) return '';
    return '<fieldset class="opt-group"><legend>' + label + '</legend><div class="opts">' + values.map(function (v) {
      return '<label class="opt"><input type="radio" name="' + name + '" value="' + esc(v) + '"' + (values.length === 1 ? ' checked' : '') + '><span>' + esc(v) + '</span></label>';
    }).join('') + '</div></fieldset>';
  }
  function openProduct(id) {
    var p = findP(id); if (!p) return;
    if (noPrice(p)) return openAsk(p);
    var imgs = p.images || [], promo = p.promo_cents && p.promo_cents < p.price_cents;
    var gallery = imgs.length ? '<img class="pm-main" id="pmMain" src="' + MM.img(imgs[0]) + '" alt="' + esc(p.name) + '">' +
      (imgs.length > 1 ? '<div class="pm-thumbs">' + imgs.map(function (u, i) { return '<button type="button" class="' + (i ? '' : 'on') + '" data-src="' + MM.img(u) + '" aria-label="Foto ' + (i + 1) + '"><img src="' + MM.img(u) + '" alt=""></button>'; }).join('') + '</div>' : '') : phHTML();
    $('#pmBody').innerHTML = '<button class="icon-btn modal-x" type="button" data-close aria-label="Fechar">' + icon('x') + '</button>' +
      '<div class="pm"><div class="pm-gallery">' + gallery + '</div><form class="pm-info" id="pmForm" novalidate>' +
      '<span class="prod-cat">' + esc(p.category) + ' · ' + esc(p.gender) + '</span><h2 id="pmName">' + esc(p.name) + '</h2>' +
      '<div class="price">' + (promo ? '<s>' + brl(p.price_cents) + '</s>' : '') + '<strong>' + brl(priceOf(p)) + '</strong></div>' +
      (isEnc(p) ? '<p class="note-box"><strong>Sob encomenda.</strong> ' + esc(encNoteText()) + ' Pagamento em PIX, dinheiro ou cartão parcelado.</p>' : instLine()) +
      (p.description ? '<p class="pm-desc">' + esc(p.description) + '</p>' : '') +
      optGroup('size', 'Tamanho', p.sizes) + optGroup('color', 'Cor', p.colors) +
      '<div><span class="sr" id="qtyLbl">Quantidade</span><div class="qty" role="group" aria-labelledby="qtyLbl"><button type="button" data-q="-1" aria-label="Diminuir">' + icon('minus') + '</button><output id="pmQty">1</output><button type="button" data-q="1" aria-label="Aumentar">' + icon('plus') + '</button></div></div>' +
      '<p class="pm-msg" id="pmMsg" role="alert"></p><button class="btn btn-gold btn-block" type="submit">' + icon('bag') + ' Adicionar à sacola</button></form></div>';
    var qty = 1, max = (p.stock == null) ? 20 : Math.max(1, Math.min(20, p.stock));
    $('#pmBody').onclick = function (e) {
      var q = e.target.closest('[data-q]');
      if (q) { qty = Math.min(max, Math.max(1, qty + Number(q.getAttribute('data-q')))); $('#pmQty').textContent = qty; }
      var th = e.target.closest('[data-src]');
      if (th) { $('#pmMain').src = th.getAttribute('data-src'); $$('.pm-thumbs button').forEach(function (b) { b.classList.toggle('on', b === th); }); }
    };
    $('#pmForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, size = (f.querySelector('input[name=size]:checked') || {}).value || '', color = (f.querySelector('input[name=color]:checked') || {}).value || '';
      if (p.sizes && p.sizes.length && !size) { $('#pmMsg').textContent = 'Escolha um tamanho.'; return; }
      if (p.colors && p.colors.length && !color) { $('#pmMsg').textContent = 'Escolha uma cor.'; return; }
      addToBag(p, size, color, qty); pmDialog.close();
    });
    pmDialog.showModal();
    if (A) A({ targets: pmDialog, opacity: [0, 1], scale: [0.96, 1], duration: 380, easing: 'easeOutCubic' });
  }
  function openAsk(p) {
    var imgs = p.images || [];
    $('#pmBody').innerHTML = '<button class="icon-btn modal-x" type="button" data-close aria-label="Fechar">' + icon('x') + '</button>' +
      '<div class="pm"><div class="pm-gallery">' + (imgs.length ? '<img class="pm-main" src="' + MM.img(imgs[0]) + '" alt="' + esc(p.name) + '">' : phHTML()) + '</div><div class="pm-info">' +
      '<span class="prod-cat">' + esc(p.category) + '</span><h2 id="pmName">' + esc(p.name) + '</h2>' +
      (p.sizes && p.sizes.length ? '<p class="pm-desc"><strong>Tamanho:</strong> ' + esc(p.sizes.join(', ')) + '</p>' : '') +
      (p.description ? '<p class="pm-desc">' + esc(p.description) + '</p>' : '') +
      '<div class="price"><strong class="ask">Preço sob consulta</strong></div>' +
      '<p class="note-box">Fale com a lojista pelo WhatsApp para saber o valor e reservar esta peça.</p>' +
      '<a class="btn btn-gold btn-block" href="' + esc(askLink(p)) + '" target="_blank" rel="noopener">' + icon('whatsapp') + ' Consultar valor no WhatsApp</a></div></div>';
    pmDialog.showModal();
  }
  $$('dialog').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); }); });

  /* ---------------- Sacola ---------------- */
  var bag = (store('mm_bag') || []).filter(function (i) { return i && i.id; });
  function saveBag() { store('mm_bag', bag); }
  function key(i) { return i.id + '|' + i.size + '|' + i.color; }
  function bagItems() { return bag.map(function (i) { return { ref: i, p: findP(i.id) }; }).filter(function (x) { return x.p && !noPrice(x.p) && (isEnc(x.p) || x.p.stock !== 0); }); }
  function bagTotal() { return bagItems().reduce(function (s, x) { return s + priceOf(x.p) * x.ref.qty; }, 0); }
  function bagCount() { return bagItems().reduce(function (s, x) { return s + x.ref.qty; }, 0); }
  function addToBag(p, size, color, qty) {
    var item = { id: p.id, size: size, color: color, qty: qty }, found = null;
    bag.forEach(function (i) { if (key(i) === key(item)) found = i; });
    if (found) found.qty = Math.min(20, found.qty + qty); else bag.push(item);
    saveBag(); updateBadge(true); toast(p.name + ' adicionado à sacola');
  }
  function updateBadge(bump) {
    var n = bagCount(); $('#bagCount').textContent = n; $('#bagCount').hidden = !n;
    $('#fab').hidden = !n; $('#fabText').textContent = 'Sacola · ' + brl(bagTotal());
    if (bump && A) A({ targets: '#bagBtn', scale: [1, 1.18, 1], duration: 500, easing: 'easeOutElastic(1, .6)' });
  }
  var drawer = $('#drawer'), scrim = $('#scrim'), lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement; renderBag();
    scrim.hidden = false; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
    if (A) { A({ targets: drawer, translateX: ['105%', '0%'], duration: 520, easing: 'easeOutExpo' }); A({ targets: scrim, opacity: [0, 1], duration: 300, easing: 'linear' }); }
    else { drawer.style.transform = 'none'; scrim.style.opacity = 1; }
    setTimeout(function () { drawer.focus(); }, 50);
  }
  function closeDrawer() {
    function done() { drawer.classList.remove('open'); scrim.hidden = true; drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    if (A) { A({ targets: drawer, translateX: '105%', duration: 380, easing: 'easeInCubic', complete: done }); A({ targets: scrim, opacity: 0, duration: 300, easing: 'linear' }); }
    else { drawer.style.transform = ''; done(); }
  }
  $('#bagBtn').addEventListener('click', openDrawer);
  $('#fab').addEventListener('click', openDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });
  function animIn() { if (A) A({ targets: '#drawerBody > *', opacity: [0, 1], translateY: [12, 0], delay: A.stagger(40), duration: 400, easing: 'easeOutCubic' }); }
  function splitBag() {
    var items = bagItems(), pr = items.filter(function (x) { return !isEnc(x.p); }), en = items.filter(function (x) { return isEnc(x.p); });
    var sum = function (a) { return a.reduce(function (s, x) { return s + priceOf(x.p) * x.ref.qty; }, 0); };
    return { items: items, pronta: pr, enc: en, prontaCents: sum(pr), encCents: sum(en) };
  }
  function lineHTML(x) {
    var p = x.p, i = x.ref, idx = bag.indexOf(i);
    var img = p.images && p.images[0] ? '<img class="line-img" src="' + MM.img(p.images[0]) + '" alt="">' : '<div class="line-img">' + phHTML() + '</div>';
    var opts = [i.size && ('Tam. ' + i.size), i.color].filter(Boolean).map(esc).join(' · ');
    return '<div class="line" data-idx="' + idx + '">' + img + '<div><h3>' + esc(p.name) + '</h3>' + (opts ? '<small>' + opts + '</small>' : '') + '<small>' + brl(priceOf(p)) + '</small></div>' +
      '<div class="line-right"><div class="qty" role="group" aria-label="Quantidade"><button type="button" data-step="-1" aria-label="Diminuir">' + icon('minus') + '</button><output>' + i.qty + '</output><button type="button" data-step="1" aria-label="Aumentar">' + icon('plus') + '</button></div><button type="button" class="linklike" data-remove>Remover</button></div></div>';
  }
  function minBarHTML(encCents) {
    var min = minEnc(); if (!min) return '';
    var okk = encCents >= min, pct = Math.min(100, Math.round(encCents / min * 100));
    return '<div class="min-bar' + (okk ? ' ok' : '') + '"><span>' + (okk ? '✓ Pedido mínimo de encomenda atingido' : 'Faltam <strong>' + brl(min - encCents) + '</strong> em peças sob encomenda para atingir o mínimo de ' + brl(min) + '.') + '</span><div class="min-track"><span style="width:' + pct + '%"></span></div></div>';
  }
  function renderBag() {
    var body = $('#drawerBody'), b = splitBag();
    $('#drawerTitle').textContent = 'Sua sacola';
    if (!b.items.length) {
      body.innerHTML = '<div class="drawer-empty">' + icon('bag') + '<p>Sua sacola está vazia.</p><a class="btn btn-dark" href="#catalogo" id="goShop">Ver as peças</a></div>';
      $('#goShop').addEventListener('click', closeDrawer); return;
    }
    var both = b.pronta.length && b.enc.length, encShort = b.enc.length && b.encCents < minEnc();
    var html = '';
    if (b.pronta.length) html += '<div class="bag-group">' + (both ? '<h3 class="gh"><span>Pronta entrega</span><span>' + brl(b.prontaCents) + '</span></h3>' : '') + b.pronta.map(lineHTML).join('') + '</div>';
    if (b.enc.length) html += '<div class="bag-group"><h3 class="gh"><span>Sob encomenda</span><span>' + brl(b.encCents) + '</span></h3>' + b.enc.map(lineHTML).join('') + minBarHTML(b.encCents) + '</div>';
    var t = b.prontaCents + b.encCents;
    html += '<div class="summary"><div class="row total"><span>Total</span><span>' + brl(t) + '</span></div>' +
      (b.pronta.length && instOn() ? '<div class="row"><small class="inst">Pronta entrega: pode parcelar sem cartão com a lojista.</small></div>' : '') +
      (b.enc.length ? '<div class="row"><small class="inst">Sob encomenda: PIX, dinheiro ou cartão parcelado.</small></div>' : '') +
      '<button type="button" class="btn btn-gold btn-block" id="toCheckout"' + (encShort ? ' disabled' : '') + '>Finalizar pedido ' + icon('arrow') + '</button>' +
      (encShort ? '<small class="err c">Complete o mínimo das peças sob encomenda ou remova-as para finalizar.</small>' : '') + '</div>';
    body.innerHTML = html;
    $$('.line', body).forEach(function (row) {
      var ref = bag[Number(row.getAttribute('data-idx'))], p = findP(ref.id);
      row.addEventListener('click', function (e) {
        var st = e.target.closest('[data-step]');
        if (st) { var max = (isEnc(p) || p.stock == null) ? 20 : Math.min(20, p.stock); ref.qty = Math.min(max, Math.max(1, ref.qty + Number(st.getAttribute('data-step')))); saveBag(); updateBadge(); renderBag(); }
        if (e.target.closest('[data-remove]')) { bag = bag.filter(function (x) { return x !== ref; }); saveBag(); updateBadge(); renderBag(); }
      });
    });
    $('#toCheckout').addEventListener('click', renderCheckout);
    animIn();
  }
  function payOpt(name, value, title, sub) { return '<label class="pay"><input type="radio" name="' + name + '" value="' + value + '"><span><strong>' + title + '</strong><small>' + sub + '</small></span></label>'; }
  function renderCheckout() {
    var body = $('#drawerBody'), b = splitBag(), t = b.prontaCents + b.encCents, wa = digits(S.whatsapp);
    if (b.enc.length && b.encCents < minEnc()) return renderBag();
    var both = b.pronta.length && b.enc.length;
    var saved = store('mm_customer') || {};
    $('#drawerTitle').textContent = 'Finalizar pedido';
    var payPronta = b.pronta.length ? '<fieldset class="field opt-group"><legend>' + (both ? 'Pagamento das peças de pronta entrega (' + brl(b.prontaCents) + ')' : 'Forma de pagamento') + '</legend><div class="pay-opts">' +
      payOpt('payment', 'pix', 'PIX', 'À vista, a lojista envia a chave') + payOpt('payment', 'dinheiro', 'Dinheiro', 'Na retirada ou na entrega') +
      (instOn() ? payOpt('payment', 'parcelado', 'Parcelado sem cartão, direto com a lojista', 'A lojista informa em quantas vezes você pode pagar') : '') +
      '</div><div id="instBox" hidden><p class="note-box" style="margin-top:10px"><strong>Importante:</strong> ' + esc(S.installments_note || MM.DEFAULTS.installments_note) + ' Envie o pedido e ela te responde com as opções no WhatsApp.</p></div><small class="err" id="payErr" role="alert"></small></fieldset>' : '';
    var payEnc = b.enc.length ? '<fieldset class="field opt-group"><legend>' + (both ? 'Pagamento das peças sob encomenda (' + brl(b.encCents) + ')' : 'Forma de pagamento') + '</legend><div class="pay-opts">' +
      payOpt('payment_enc', 'pix', 'PIX', 'A lojista envia a chave') + payOpt('payment_enc', 'dinheiro', 'Dinheiro', 'Combinado com a lojista') +
      payOpt('payment_enc', 'cartao', 'Cartão parcelado', 'Parcelas no cartão combinadas com a lojista') +
      '</div><small class="err" id="payEncErr" role="alert"></small></fieldset>' : '';
    body.innerHTML = '<button type="button" class="checkout-back" id="backBag">← Voltar para a sacola</button>' +
      (!wa ? '<p class="note-box">A loja ainda está configurando o recebimento de pedidos. Tente novamente em breve.</p>' : '') +
      '<form id="checkout" class="form flat" novalidate>' +
      '<div class="field"><label for="coName">Seu nome</label><input id="coName" name="name" autocomplete="name" maxlength="80" value="' + esc(saved.name || '') + '"><small class="err" role="alert"></small></div>' +
      '<div class="field"><label for="coPhone">Seu WhatsApp (com DDD)</label><input id="coPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(11) 99999-9999" value="' + esc(saved.phone || '') + '"><small class="err" role="alert"></small></div>' +
      '<fieldset class="field opt-group"><legend>Como quer receber?</legend><div class="seg"><label class="pay"><input type="radio" name="delivery" value="retirada" checked><span><strong>Retirada</strong><small>a combinar</small></span></label><label class="pay"><input type="radio" name="delivery" value="entrega"><span><strong>Entrega</strong><small>a combinar</small></span></label></div></fieldset>' +
      '<div class="field" id="addrField" hidden><label for="coAddr">Endereço para entrega</label><textarea id="coAddr" name="address" rows="2" maxlength="250" autocomplete="street-address">' + esc(saved.address || '') + '</textarea><small class="err" role="alert"></small></div>' +
      payPronta + payEnc +
      (b.enc.length ? '<p class="note-box"><strong>Sob encomenda:</strong> ' + esc(encNoteText()) + '</p>' : '') +
      '<div class="field"><label for="coNotes">Observações (opcional)</label><textarea id="coNotes" name="notes" rows="2" maxlength="400" placeholder="Ex.: prefiro retirar no sábado"></textarea></div>' +
      '<div class="summary">' + (both ? '<div class="row"><span>Pronta entrega</span><span>' + brl(b.prontaCents) + '</span></div><div class="row"><span>Sob encomenda</span><span>' + brl(b.encCents) + '</span></div>' : '<div class="row"><span>' + bagCount() + (bagCount() === 1 ? ' peça' : ' peças') + '</span><span>' + brl(t) + '</span></div>') +
      '<div class="row total"><span>Total</span><span>' + brl(t) + '</span></div></div>' +
      '<button type="submit" class="btn btn-gold btn-block" id="coSubmit"' + (!wa ? ' disabled' : '') + '>' + icon('whatsapp') + ' Enviar pedido no WhatsApp</button><p class="err c" id="coErr" role="alert"></p></form>';
    var form = $('#checkout');
    $('#backBag').addEventListener('click', renderBag);
    form.addEventListener('change', function (e) {
      if (e.target.name === 'delivery') $('#addrField').hidden = e.target.value !== 'entrega';
      if (e.target.name === 'payment') { var show = e.target.value === 'parcelado'; $('#instBox').hidden = !show; $('#payErr').textContent = ''; if (show && A) A({ targets: '#instBox', opacity: [0, 1], translateY: [-6, 0], duration: 300, easing: 'easeOutCubic' }); }
      if (e.target.name === 'payment_enc') $('#payEncErr').textContent = '';
    });
    $('#coPhone').addEventListener('input', function (e) { var d = e.target.value.replace(/\D/g, '').slice(0, 11); e.target.value = d.length > 6 ? '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4) : d.length > 2 ? '(' + d.slice(0, 2) + ') ' + d.slice(2) : d; });
    var check = liveValidate(form, {
      name: function (v) { return v.trim().length >= 2 ? '' : 'Informe seu nome.'; },
      phone: function (v) { return v.replace(/\D/g, '').length >= 10 ? '' : 'Informe um WhatsApp com DDD.'; },
      address: function (v) { return (form.querySelector('input[name=delivery]:checked').value !== 'entrega' || v.trim().length >= 8) ? '' : 'Informe o endereço completo.'; }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!check()) return;
      var pay = form.querySelector('input[name=payment]:checked'), payE = form.querySelector('input[name=payment_enc]:checked');
      var missing = false;
      if (b.pronta.length && !pay) { $('#payErr').textContent = 'Escolha a forma de pagamento.'; missing = true; }
      if (b.enc.length && !payE) { $('#payEncErr').textContent = 'Escolha a forma de pagamento.'; missing = true; }
      if (missing) return;
      var delivery = form.querySelector('input[name=delivery]:checked').value;
      var c = { name: form.name.value.trim(), phone: form.phone.value.trim(), address: form.address.value.trim() };
      store('mm_customer', c);
      var notes = form.notes.value.trim();
      var btn = $('#coSubmit'); btn.disabled = true; btn.textContent = 'Registrando pedido...'; $('#coErr').textContent = '';
      var win = null; try { win = window.open('', '_blank'); } catch (er) { win = null; }
      sb.rpc('place_order', {
        p_name: c.name, p_phone: c.phone, p_delivery: delivery, p_address: delivery === 'entrega' ? c.address : '',
        p_payment: pay ? pay.value : null, p_payment_encomenda: payE ? payE.value : null, p_notes: notes,
        p_items: b.items.map(function (x) { return { id: x.ref.id, qty: x.ref.qty, size: x.ref.size, color: x.ref.color }; })
      }).then(function (r) {
        if (r.error) throw new Error(r.error.message);
        var o = r.data;
        var PL = { pix: 'PIX', dinheiro: 'Dinheiro', parcelado: 'Parcelado sem cartão (aguardando a lojista informar a quantidade de parcelas)', cartao: 'Cartão parcelado (combinar parcelas com a lojista)' };
        function lines(kind) { return o.items.filter(function (l) { return (l.kind || 'pronta') === kind; }).map(function (l) { var op = [l.size && ('Tam. ' + l.size), l.color].filter(Boolean).join(', '); return '- ' + l.qty + 'x ' + l.name + (op ? ' (' + op + ')' : '') + ' - ' + brl(l.unit_cents * l.qty); }); }
        var msg = ['*Novo pedido ' + o.code + ' - ' + S.store_name + '*', '', '*Cliente:* ' + c.name, '*WhatsApp:* ' + c.phone];
        if (o.pronta_cents) msg = msg.concat(['', '*PRONTA ENTREGA*'], lines('pronta'), ['Subtotal: ' + brl(o.pronta_cents), 'Pagamento: ' + PL[pay.value]]);
        if (o.encomenda_cents) msg = msg.concat(['', '*SOB ENCOMENDA (buscar no fornecedor)*'], lines('encomenda'), ['Subtotal: ' + brl(o.encomenda_cents), 'Pagamento: ' + PL[payE.value]]);
        msg = msg.concat(['', '*Total:* ' + brl(o.total_cents), '*Recebimento:* ' + (delivery === 'entrega' ? 'Entrega - ' + c.address : 'Retirada (combinar com a lojista)')]);
        if (notes) msg.push('*Obs.:* ' + notes);
        var url = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg.join('\n'));
        if (win) win.location.href = url; else window.location.href = url;
        bag = []; saveBag(); updateBadge();
        renderDone(o.code, url);
      }).catch(function (err) {
        if (win) win.close();
        $('#coErr').textContent = (err && err.message) || 'Não foi possível enviar. Verifique sua internet e tente de novo.';
        btn.disabled = false; btn.innerHTML = icon('whatsapp') + ' Enviar pedido no WhatsApp';
        loadData();
      });
    });
    animIn(); $('#coName').focus();
  }
  function renderDone(code, url) {
    $('#drawerTitle').textContent = 'Pedido pronto';
    $('#drawerBody').innerHTML = '<div class="done"><div class="done-ico">' + icon('check') + '</div><h3 style="font-size:1.3rem">Pedido <code>' + esc(code) + '</code> pronto!</h3>' +
      '<p>Abrimos o WhatsApp com seu pedido. É só tocar em <strong>enviar</strong> para a lojista receber. Se não abriu, use o botão abaixo.</p>' +
      '<a class="btn btn-gold btn-block" href="' + esc(url) + '" target="_blank" rel="noopener">' + icon('whatsapp') + ' Abrir WhatsApp</a>' +
      '<button type="button" class="btn btn-ghost btn-block" id="doneClose" style="margin-top:10px">Continuar navegando</button></div>';
    $('#doneClose').addEventListener('click', closeDrawer);
    if (A) A({ targets: '.done-ico', scale: [0, 1], rotate: [-90, 0], duration: 900, easing: 'easeOutElastic(1, .6)' });
  }
  function liveValidate(form, rules) {
    function one(name) {
      var el = form.elements[name]; if (!el) return true;
      var field = el.closest('.field'); if (field.hidden) return true;
      var msg = rules[name](el.value);
      field.classList.toggle('invalid', !!msg); field.classList.toggle('valid', !msg && el.value.trim() !== '');
      var err = field.querySelector('.err'); if (err) err.textContent = msg;
      return !msg;
    }
    Object.keys(rules).forEach(function (n) {
      var el = form.elements[n]; if (!el) return;
      el.addEventListener('input', function () { if (el.closest('.field').classList.contains('invalid')) one(n); });
      el.addEventListener('blur', function () { one(n); });
    });
    return function () {
      var ok = Object.keys(rules).map(one).every(Boolean);
      if (!ok) { var f = form.querySelector('.field.invalid input, .field.invalid textarea'); if (f) f.focus(); if (A) A({ targets: form.querySelectorAll('.field.invalid'), translateX: [0, -6, 6, -4, 4, 0], duration: 400, easing: 'easeInOutSine' }); }
      return ok;
    };
  }
  var cForm = $('#contactForm');
  var cCheck = liveValidate(cForm, {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Informe seu nome.'; },
    message: function (v) { return v.trim().length >= 5 ? '' : 'Escreva sua mensagem (mín. 5 caracteres).'; }
  });
  cForm.addEventListener('submit', function (e) {
    e.preventDefault(); if (!cCheck()) return;
    var st = $('#cStatus'), wa = digits(S.whatsapp);
    if (!wa) { st.textContent = 'O WhatsApp da loja ainda não foi configurado.'; st.classList.add('bad'); return; }
    window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent('Olá! Sou ' + cForm.name.value.trim() + '.\n' + cForm.message.value.trim()), '_blank', 'noopener');
    st.classList.remove('bad'); st.textContent = 'Abrimos o WhatsApp com sua mensagem.';
    cForm.reset(); $$('.field', cForm).forEach(function (f) { f.classList.remove('valid'); });
  });
  var LEGAL = {
    privacidade: ['Política de Privacidade', '<p>Esta política explica como a loja trata seus dados pessoais, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p><h3>Quais dados usamos</h3><p>Ao fazer um pedido: nome, número de WhatsApp, endereço (quando você escolhe entrega), itens escolhidos, forma de pagamento e observações.</p><h3>Para que usamos</h3><p>Exclusivamente para processar e entregar o seu pedido, controlar pagamentos e falar com você sobre ele. Não vendemos nem compartilhamos seus dados para fins de marketing.</p><h3>Onde ficam</h3><p>Os pedidos ficam registrados no sistema da loja, com acesso restrito à lojista. A conversa acontece no WhatsApp, que tem sua própria política de privacidade.</p><h3>No seu navegador</h3><p>Guardamos a sacola e seus dados de contato no próprio navegador para facilitar a próxima compra. Você pode apagar isso limpando os dados do site.</p><h3>Seus direitos</h3><p>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento falando com a loja pelo WhatsApp.</p>'],
    termos: ['Termos de Uso', '<p>Ao usar este site você concorda com estes termos.</p><h3>Pedidos</h3><p>O envio do pedido pelo site é uma solicitação. A venda é confirmada pela lojista no WhatsApp, após checagem de disponibilidade.</p><h3>Preços e pagamento</h3><p>Os preços exibidos podem mudar sem aviso, mas o valor confirmado pela lojista no seu pedido é mantido. O parcelamento sem cartão é combinado diretamente com a lojista, que informa a quantidade de parcelas e as datas.</p><h3>Entrega e retirada</h3><p>Prazos, valores de entrega e horários de retirada são combinados com a lojista.</p><h3>Trocas</h3><p>As condições de troca são informadas pela lojista no momento da compra, respeitando o Código de Defesa do Consumidor.</p>']
  };
  $$('[data-legal]').forEach(function (b) { b.addEventListener('click', function () { var l = LEGAL[b.getAttribute('data-legal')]; $('#legalTitle').textContent = l[0]; $('#legalBody').innerHTML = l[1]; $('#legalModal').showModal(); }); });

  /* ---------------- Dados (Supabase) ---------------- */
  function loadData() {
    return Promise.all([
      sb.from('store_settings').select('data').eq('id', 1).maybeSingle(),
      sb.from('products').select('*').eq('active', true).order('featured', { ascending: false }).order('created_at', { ascending: false })
    ]).then(function (r) {
      if (r[0].data && r[0].data.data) S = Object.assign({}, MM.DEFAULTS, r[0].data.data);
      if (r[1].error) throw r[1].error;
      PRODUCTS = r[1].data || [];
      return true;
    });
  }

  /* ---------------- Inicialização ---------------- */
  applySettings();
  renderGrid(false, 'Carregando peças...');
  loadData().then(function () {
    applySettings(); renderCats(); renderGrid(false); updateBadge();
  }).catch(function () {
    renderGrid(false, 'Não foi possível carregar as peças agora. Verifique sua internet e atualize a página.');
  }).then(function () {
    if (A) $$('[data-hero], #heroLogo, #logoStage, #heroTitle').forEach(function (el) { el.style.opacity = ''; });
    heroIntro(); runCounters(); setupHow();
  });
})();
