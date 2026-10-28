/* May Modas — Área da Lojista (Supabase) */
(function () {
  'use strict';
  var sb = MM.sb, brl = MM.brl, esc = MM.esc, digits = MM.digits;
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function icon(id) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; }
  var toastT;
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2800); }
  function fail(e) { console.error(e); toast((e && e.message) || 'Algo deu errado. Tente de novo.'); }
  function ok(r) { if (r && r.error) throw r.error; return r ? r.data : null; }

  // ---------- datas ----------
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addMonths(iso, n) {
    var p = iso.split('-').map(Number), y = p[0], m = p[1] - 1 + n, d = p[2];
    var last = new Date(y, m + 1, 0).getDate(), dt = new Date(y, m, Math.min(d, last));
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }
  function fmtDate(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function fmtDateTime(ts) { return new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
  function cents(v) { var s = String(v || '').trim(); if (!s) return null; var n = Number(s.replace(/\./g, '').replace(',', '.')); return isFinite(n) && n > 0 ? Math.round(n * 100) : NaN; }
  function money(c) { return c == null ? '' : (c / 100).toFixed(2).replace('.', ','); }
  function waLink(phone, text) { var d = digits(phone); if (d.length <= 11) d = '55' + d; return 'https://wa.me/' + d + (text ? '?text=' + encodeURIComponent(text) : ''); }

  var SETTINGS = Object.assign({}, MM.DEFAULTS);
  var STATUS = { novo: 'Novo', confirmado: 'Venda confirmada', entregue: 'Entregue', cancelado: 'Cancelado' };
  var PAY = { pix: 'PIX', dinheiro: 'Dinheiro', parcelado: 'Parcelado sem cartão', cartao: 'Cartão parcelado' };
  function payText(o) {
    var a = [];
    if (o.payment) a.push((o.has_encomenda ? 'Pronta: ' : '') + PAY[o.payment]);
    if (o.payment_encomenda) a.push((o.payment ? 'Encomenda: ' : 'Encomenda · ') + PAY[o.payment_encomenda]);
    return a.join(' · ');
  }
  function itemsHTML(items) {
    var pr = items.filter(function (i) { return (i.kind || 'pronta') === 'pronta'; }), en = items.filter(function (i) { return i.kind === 'encomenda'; });
    var li = function (i) { return '<li>' + i.qty + 'x ' + esc(i.name) + (i.size ? ' · ' + esc(i.size) : '') + (i.color ? ' · ' + esc(i.color) : '') + ' · ' + brl(i.unit_cents * i.qty) + '</li>'; };
    if (!en.length) return '<ul>' + pr.map(li).join('') + '</ul>';
    return (pr.length ? '<div class="meta" style="margin-top:6px"><strong>Pronta entrega</strong></div><ul>' + pr.map(li).join('') + '</ul>' : '') +
      '<div class="meta" style="margin-top:6px"><strong>Sob encomenda</strong> (buscar no fornecedor)</div><ul>' + en.map(li).join('') + '</ul>';
  }

  /* =================== AUTENTICAÇÃO =================== */
  var mode = 'login';
  function setMode(m) {
    mode = m;
    $('#loginErr').textContent = ''; $('#loginOk').textContent = '';
    $('#passField').hidden = m === 'reset';
    $('#lPass').autocomplete = m === 'signup' ? 'new-password' : 'current-password';
    $('#loginTitle').textContent = m === 'signup' ? 'Primeiro acesso' : m === 'reset' ? 'Recuperar senha' : 'Área da Lojista';
    $('#loginSub').textContent = m === 'signup' ? 'Use o e-mail autorizado da loja e crie uma senha (mín. 8 caracteres).' : m === 'reset' ? 'Enviaremos um link para você criar uma nova senha.' : 'Entre para gerenciar pedidos, parcelas e produtos.';
    $('#loginBtn').textContent = m === 'signup' ? 'Criar senha' : m === 'reset' ? 'Enviar link' : 'Entrar';
    $('#toSignup').textContent = m === 'login' ? 'Primeiro acesso? Criar senha' : 'Já tenho senha';
  }
  $('#toSignup').addEventListener('click', function () { setMode(mode === 'login' ? 'signup' : 'login'); });
  $('#toReset').addEventListener('click', function () { setMode('reset'); });
  function showLogin() { $('#appView').hidden = true; $('#newPassView').hidden = true; $('#loginView').hidden = false; }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('#lEmail').value.trim().toLowerCase(), pass = $('#lPass').value, btn = $('#loginBtn');
    $('#loginErr').textContent = ''; $('#loginOk').textContent = '';
    if (!/^\S+@\S+\.\S+$/.test(email)) { $('#loginErr').textContent = 'Informe um e-mail válido.'; return; }
    if (mode !== 'reset' && pass.length < (mode === 'signup' ? 8 : 1)) { $('#loginErr').textContent = mode === 'signup' ? 'A senha precisa ter pelo menos 8 caracteres.' : 'Informe a senha.'; return; }
    btn.disabled = true;
    var back = location.origin + location.pathname;
    var p = mode === 'login' ? sb.auth.signInWithPassword({ email: email, password: pass })
      : mode === 'signup' ? sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: back } })
      : sb.auth.resetPasswordForEmail(email, { redirectTo: back });
    p.then(function (r) {
      if (r.error) throw r.error;
      if (mode === 'reset') { $('#loginOk').textContent = 'Se este e-mail estiver cadastrado, você vai receber o link em instantes.'; return; }
      if (mode === 'signup' && !(r.data && r.data.session)) { $('#loginOk').textContent = 'Conta criada! Abra o e-mail de confirmação que enviamos e depois entre aqui com sua senha.'; setMode('login'); $('#loginOk').textContent = 'Conta criada! Confirme pelo link que enviamos para o seu e-mail e depois entre com sua senha.'; return; }
      $('#lPass').value = '';
      return start();
    }).catch(function (err) {
      var m = (err && err.message) || '';
      $('#loginErr').textContent = /Invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /not confirmed/i.test(m) ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.' : /already registered/i.test(m) ? 'Este e-mail já tem conta. Use "Já tenho senha" ou "Esqueci a senha".' : 'Não foi possível concluir. ' + m;
    }).then(function () { btn.disabled = false; });
  });
  $('#newPassForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = $('#np1').value;
    if (p.length < 8) { $('#npErr').textContent = 'A senha precisa ter pelo menos 8 caracteres.'; return; }
    sb.auth.updateUser({ password: p }).then(function (r) { if (r.error) throw r.error; toast('Senha atualizada!'); history.replaceState(null, '', location.pathname); start(); })
      .catch(function (err) { $('#npErr').textContent = err.message; });
  });
  $('#logout').addEventListener('click', function () { sb.auth.signOut().then(function () { location.reload(); }); });
  sb.auth.onAuthStateChange(function (ev) {
    if (ev === 'PASSWORD_RECOVERY') { $('#loginView').hidden = true; $('#appView').hidden = true; $('#newPassView').hidden = false; }
  });

  function start() {
    return sb.rpc('is_admin').then(function (r) {
      if (r.error || r.data !== true) {
        return sb.auth.signOut().then(function () { showLogin(); $('#loginErr').textContent = 'Esta conta não tem acesso à Área da Lojista.'; });
      }
      return sb.auth.getUser().then(function (u) {
        $('#who').textContent = (u.data.user && u.data.user.email) || '';
        $('#loginView').hidden = true; $('#newPassView').hidden = true; $('#appView').hidden = false;
        return loadSettings().then(function () { go(location.hash.replace('#', '') || 'inicio'); refreshPills(); });
      });
    });
  }

  /* =================== NAVEGAÇÃO =================== */
  var TITLES = { inicio: 'Início', pedidos: 'Pedidos', parcelas: 'Parcelas', encomendas: 'Comprar no fornecedor', produtos: 'Produtos', repasse: 'Repasse', loja: 'Minha loja' };
  var VIEWS = {};
  function go(v) {
    if (!VIEWS[v]) v = 'inicio';
    $$('.side-nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-view') === v); });
    $('#viewTitle').textContent = TITLES[v];
    $('#side').classList.remove('open');
    history.replaceState(null, '', '#' + v);
    $('#view').innerHTML = '<p class="muted">Carregando...</p>';
    Promise.resolve(VIEWS[v]()).catch(fail);
  }
  $('.side-nav').addEventListener('click', function (e) { var b = e.target.closest('[data-view]'); if (b) go(b.getAttribute('data-view')); });
  $('#mobMenu').addEventListener('click', function () { $('#side').classList.toggle('open'); });
  $('#view').addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g) go(g.getAttribute('data-go')); });

  function loadSettings() {
    return sb.from('store_settings').select('data').eq('id', 1).maybeSingle().then(function (r) { if (r.data) SETTINGS = Object.assign({}, MM.DEFAULTS, r.data.data); });
  }
  function refreshPills() {
    Promise.all([
      sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'novo'),
      sb.from('installments').select('id', { count: 'exact', head: true }).is('paid_at', null).lt('due_date', todayISO())
    ]).then(function (r) {
      var n = r[0].count || 0, v = r[1].count || 0;
      $('#pillNovos').textContent = n; $('#pillNovos').hidden = !n;
      $('#pillVencidas').textContent = v; $('#pillVencidas').hidden = !v;
    });
  }

  // ---------- diálogo ----------
  var dlg = $('#dlg');
  function openDlg(html) { $('#dlgBody').innerHTML = '<button class="icon-btn modal-x" type="button" data-close aria-label="Fechar">' + icon('x') + '</button>' + html; dlg.showModal(); }
  dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });

  /* =================== INÍCIO =================== */
  VIEWS.inicio = function () {
    return Promise.all([
      sb.from('orders').select('*').eq('status', 'novo').order('created_at', { ascending: false }),
      sb.from('installments').select('*, orders(code, customer_name, customer_phone)').order('due_date')
    ]).then(function (r) {
      var novos = ok(r[0]) || [], inst = ok(r[1]) || [], hoje = todayISO();
      var aberto = inst.filter(function (i) { return !i.paid_at; });
      var vencidas = aberto.filter(function (i) { return i.due_date < hoje; });
      var em7 = addDays(hoje, 7);
      var proximas = aberto.filter(function (i) { return i.due_date >= hoje && i.due_date <= em7; });
      var sum = function (a) { return a.reduce(function (s, i) { return s + i.amount_cents; }, 0); };
      var setup = [];
      if (!digits(SETTINGS.whatsapp)) setup.push('Cadastre o WhatsApp da loja em <button type="button" class="linklike" data-go="loja">Minha loja</button>.');
      $('#view').innerHTML =
        (setup.length ? '<div class="helpbox">' + setup.join('<br>') + '</div>' : '') +
        '<div class="stats">' +
        '<div class="stat"><span>Pedidos novos</span><strong>' + novos.length + '</strong></div>' +
        '<div class="stat"><span>A receber (parcelas)</span><strong>' + brl(sum(aberto)) + '</strong></div>' +
        '<div class="stat' + (vencidas.length ? ' alert' : '') + '"><span>Vencidas</span><strong>' + vencidas.length + ' · ' + brl(sum(vencidas)) + '</strong></div>' +
        '<div class="stat"><span>Já recebido</span><strong>' + brl(sum(inst.filter(function (i) { return i.paid_at; }))) + '</strong></div></div>' +
        '<div class="panel"><h2>Pedidos esperando confirmação</h2>' + (novos.length ? novos.slice(0, 5).map(function (o) {
          return '<div class="inst-row"><strong>' + esc(o.code) + '</strong> ' + esc(o.customer_name) + ' · ' + brl(o.total_cents) + ' · ' + payText(o) + ' <span class="muted">' + fmtDateTime(o.created_at) + '</span></div>';
        }).join('') + '<p style="margin:10px 0 0"><button type="button" class="btn btn-dark btn-sm" data-go="pedidos">Ver pedidos</button></p>' : '<p class="muted">Nenhum pedido novo.</p>') + '</div>' +
        '<div class="panel"><h2>Parcelas vencidas e dos próximos 7 dias</h2>' + (vencidas.concat(proximas).length ? vencidas.concat(proximas).map(instRow).join('') + '<p style="margin:10px 0 0"><button type="button" class="btn btn-dark btn-sm" data-go="parcelas">Ver todas as parcelas</button></p>' : '<p class="muted">Nada vencendo por agora.</p>') + '</div>';
      bindInstActions($('#view'), VIEWS.inicio);
    });
  };
  function addDays(iso, n) { var p = iso.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2] + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* =================== PEDIDOS =================== */
  var orderFilter = 'novo';
  VIEWS.pedidos = function () {
    var q = sb.from('orders').select('*, installments(*)').order('created_at', { ascending: false }).limit(300);
    if (orderFilter) q = q.eq('status', orderFilter);
    return q.then(function (r) {
      var list = ok(r) || [];
      $('#view').innerHTML = '<div class="bar-tools"><div class="chips" id="of">' +
        [['novo', 'Novos'], ['confirmado', 'Confirmados'], ['entregue', 'Entregues'], ['cancelado', 'Cancelados'], ['', 'Todos']].map(function (c) { return '<button type="button" class="chip' + (orderFilter === c[0] ? ' on' : '') + '" data-f="' + c[0] + '">' + c[1] + '</button>'; }).join('') +
        '</div></div><div class="list">' + (list.length ? list.map(orderCard).join('') : '<div class="empty">Nenhum pedido aqui.</div>') + '</div>';
      $('#of').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { orderFilter = b.getAttribute('data-f'); VIEWS.pedidos(); } });
      $$('.order[data-id]').forEach(function (el) {
        var o = list.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
        el.addEventListener('click', function (e) {
          if (e.target.closest('[data-confirm]')) openConfirm(o);
          if (e.target.closest('[data-deliver]')) sb.from('orders').update({ status: 'entregue' }).eq('id', o.id).then(ok).then(function () { toast('Pedido marcado como entregue'); VIEWS.pedidos(); }).catch(fail);
          if (e.target.closest('[data-cancel]')) {
            var b = e.target.closest('[data-cancel]');
            if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = 'Toque de novo para cancelar'; setTimeout(function () { b.removeAttribute('data-sure'); b.textContent = 'Cancelar'; }, 3000); return; }
            sb.rpc('cancel_order', { p_order: o.id }).then(ok).then(function () { toast('Pedido cancelado e estoque devolvido'); refreshPills(); VIEWS.pedidos(); }).catch(fail);
          }
        });
      });
    });
  };
  function orderCard(o) {
    var insts = (o.installments || []).slice().sort(function (a, b) { return a.number - b.number; });
    var acts = [];
    if (o.status === 'novo') acts.push('<button type="button" class="btn btn-gold btn-sm" data-confirm>Confirmar venda</button>');
    if (o.status === 'confirmado') acts.push('<button type="button" class="btn btn-ghost btn-sm" data-confirm>Editar parcelas</button>', '<button type="button" class="btn btn-dark btn-sm" data-deliver>Marcar entregue</button>');
    if (o.status !== 'cancelado') acts.push('<button type="button" class="btn btn-ghost btn-sm" data-cancel>Cancelar</button>');
    return '<article class="order" data-id="' + o.id + '"><div>' +
      '<h3>' + esc(o.code) + ' · ' + esc(o.customer_name) + ' <span class="badge ' + o.status + '">' + STATUS[o.status] + '</span></h3>' +
      '<div class="meta">' + fmtDateTime(o.created_at) + ' · ' + payText(o) + ' · ' + (o.delivery === 'entrega' ? 'Entrega' : 'Retirada') + '</div>' +
      (o.address ? '<div class="meta">Endereço: ' + esc(o.address) + '</div>' : '') +
      itemsHTML(o.items) +
      (o.notes ? '<div class="meta" style="margin-top:6px">Obs.: ' + esc(o.notes) + '</div>' : '') +
      (insts.length ? '<div class="inst-list">' + insts.map(function (i) { return '<div class="inst-row">Parcela ' + i.number + ': ' + brl(i.amount_cents) + ' · vence ' + fmtDate(i.due_date) + ' ' + instBadge(i) + '</div>'; }).join('') + '</div>' : '') +
      '</div><div class="right"><span class="total">' + brl(o.total_cents) + '</span>' +
      '<a class="wa" href="' + waLink(o.customer_phone) + '" target="_blank" rel="noopener">' + icon('whatsapp') + ' ' + MM.formatPhone(o.customer_phone) + '</a>' +
      '<div class="acts">' + acts.join('') + '</div></div></article>';
  }
  function instBadge(i) {
    if (i.paid_at) return '<span class="badge pago">Paga ' + fmtDate(i.paid_at) + '</span>';
    return i.due_date < todayISO() ? '<span class="badge vencida">Vencida</span>' : '<span class="badge aberta">Em aberto</span>';
  }

  // ---------- confirmar venda / parcelas ----------
  function openConfirm(o) {
    var paidCount = (o.installments || []).filter(function (i) { return i.paid_at; }).length;
    var paidSum = (o.installments || []).filter(function (i) { return i.paid_at; }).reduce(function (s, i) { return s + i.amount_cents; }, 0);
    var restante = o.total_cents - paidSum;
    var parcelado = o.payment === 'parcelado' || o.payment_encomenda === 'cartao';
    var settle = SETTINGS.settlement_date || '';
    openDlg('<h2>' + (o.status === 'novo' ? 'Confirmar venda' : 'Editar parcelas') + '</h2>' +
      '<p class="muted" style="margin:0 0 12px">' + esc(o.code) + ' · ' + esc(o.customer_name) + ' · total ' + brl(o.total_cents) + (paidSum ? ' · já pago ' + brl(paidSum) : '') + '</p>' +
      '<form id="cf" class="fgrid" novalidate>' +
      '<div class="field"><label for="cfN">Quantidade de parcelas</label><select id="cfN">' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<option value="' + n + '"' + (n === (parcelado ? 3 : 1) ? ' selected' : '') + '>' + (n === 1 ? 'À vista (1x)' : n + 'x') + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="cfD">1º vencimento</label><input id="cfD" type="date" value="' + (parcelado ? addMonths(todayISO(), 1) : todayISO()) + '"></div>' +
      '<div class="field full"><span class="lbl">Parcelas (pode ajustar datas e valores)</span><div class="parc-grid" id="cfLines"></div><small class="hint" id="cfSum"></small></div>' +
      '<label class="chk full"><input type="checkbox" id="cfPaid"' + (parcelado ? '' : ' checked') + '> Já recebi a 1ª parcela / pagamento à vista</label>' +
      '<p class="err full" id="cfErr" role="alert"></p>' +
      '<div class="full actions"><button class="btn btn-gold" type="submit">' + (o.status === 'novo' ? 'Confirmar venda' : 'Salvar parcelas') + '</button><button class="btn btn-ghost" type="button" data-close>Voltar</button></div>' +
      (o.status === 'novo' ? '<p class="hint full">Ao confirmar, o estoque das peças de pronta entrega é baixado automaticamente. As peças sob encomenda vão para a lista “Comprar no fornecedor”.' + (o.payment_encomenda === 'cartao' ? ' Se a encomenda foi paga no cartão, registre aqui como recebida (o valor entra pela maquininha).' : '') + '</p>' : '') + '</form>');
    function build() {
      var n = Number($('#cfN').value), d0 = $('#cfD').value || todayISO();
      var base = Math.floor(restante / n), extra = restante - base * n, html = '';
      for (var k = 0; k < n; k++) {
        html += '<div class="parc-line"><strong>' + (paidCount + k + 1) + 'ª</strong><input type="date" data-d value="' + addMonths(d0, k) + '"><input inputmode="decimal" data-v value="' + money(base + (k === 0 ? extra : 0)) + '"></div>';
      }
      $('#cfLines').innerHTML = html; check();
    }
    function check() {
      var s = $$('#cfLines [data-v]').reduce(function (a, el) { var c = cents(el.value); return a + (c > 0 ? c : 0); }, 0);
      var late = settle && $$('#cfLines [data-d]').some(function (el) { return el.value > settle; });
      $('#cfSum').innerHTML = 'Soma: ' + brl(s) + (s !== restante ? ' <strong style="color:var(--danger)">(deveria ser ' + brl(restante) + ')</strong>' : ' ✓') +
        (late ? '<br><strong style="color:var(--danger)">Atenção: há parcela vencendo depois do acerto com o revendedor (' + fmtDate(settle) + ').</strong>' : '');
      return s === restante;
    }
    $('#cfN').addEventListener('change', build); $('#cfD').addEventListener('change', build);
    $('#cfLines').addEventListener('input', check);
    build();
    $('#cf').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!check()) { $('#cfErr').textContent = 'A soma das parcelas precisa fechar com o valor do pedido.'; return; }
      var parcelas = $$('#cfLines .parc-line').map(function (l) { return { due_date: $('[data-d]', l).value, amount_cents: cents($('[data-v]', l).value) }; });
      if (parcelas.some(function (p) { return !p.due_date || !(p.amount_cents > 0); })) { $('#cfErr').textContent = 'Preencha data e valor de todas as parcelas.'; return; }
      var paidFirst = $('#cfPaid').checked;
      sb.rpc('confirm_order', { p_order: o.id, p_parcelas: parcelas }).then(ok).then(function () {
        if (!paidFirst) return;
        return sb.from('installments').update({ paid_at: new Date().toISOString() }).eq('order_id', o.id).is('paid_at', null).eq('number', paidCount + 1).then(ok);
      }).then(function () { dlg.close(); toast(o.status === 'novo' ? 'Venda confirmada!' : 'Parcelas atualizadas'); refreshPills(); VIEWS.pedidos(); }).catch(function (err) { $('#cfErr').textContent = err.message; });
    });
  }

  /* =================== PARCELAS =================== */
  var instFilter = 'abertas';
  VIEWS.parcelas = function () {
    var q = sb.from('installments').select('*, orders(code, customer_name, customer_phone, status)').order('due_date');
    if (instFilter === 'abertas') q = q.is('paid_at', null); else if (instFilter === 'pagas') q = q.not('paid_at', 'is', null);
    return q.then(function (r) {
      var list = (ok(r) || []).filter(function (i) { return i.orders && i.orders.status !== 'cancelado'; });
      var total = list.reduce(function (s, i) { return s + i.amount_cents; }, 0);
      $('#view').innerHTML = '<div class="bar-tools"><div class="chips" id="pf">' + [['abertas', 'Em aberto'], ['pagas', 'Pagas'], ['todas', 'Todas']].map(function (c) { return '<button type="button" class="chip' + (instFilter === c[0] ? ' on' : '') + '" data-f="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div><strong>' + list.length + ' parcelas · ' + brl(total) + '</strong></div>' +
        '<div class="panel">' + (list.length ? list.map(instRow).join('') : '<p class="muted">Nenhuma parcela aqui.</p>') + '</div>';
      $('#pf').addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (b) { instFilter = b.getAttribute('data-f'); VIEWS.parcelas(); } });
      bindInstActions($('#view'), VIEWS.parcelas);
    });
  };
  function instRow(i) {
    var o = i.orders || {};
    var msg = 'Olá, ' + (o.customer_name || '').split(' ')[0] + '! Passando para lembrar da parcela ' + i.number + ' de ' + brl(i.amount_cents) + ' do seu pedido ' + o.code + ' na ' + SETTINGS.store_name + ', com vencimento em ' + fmtDate(i.due_date) + '. Qualquer dúvida é só me chamar. Obrigada!';
    return '<div class="order" style="box-shadow:none;margin-bottom:8px" data-inst="' + i.id + '"><div><h3>' + brl(i.amount_cents) + ' · ' + esc(o.customer_name || '') + ' ' + instBadge(i) + '</h3>' +
      '<div class="meta">Parcela ' + i.number + ' · pedido ' + esc(o.code || '') + ' · vence ' + fmtDate(i.due_date) + '</div></div>' +
      '<div class="right"><div class="acts">' + (i.paid_at ? '<button type="button" class="btn btn-ghost btn-sm" data-unpay>Desfazer</button>'
        : '<button type="button" class="btn btn-gold btn-sm" data-pay>' + icon('check') + ' Marcar paga</button><a class="btn btn-ghost btn-sm" href="' + waLink(o.customer_phone, msg) + '" target="_blank" rel="noopener">' + icon('whatsapp') + ' Lembrar</a>') + '</div></div></div>';
  }
  function bindInstActions(root, reload) {
    $$('[data-inst]', root).forEach(function (el) {
      el.addEventListener('click', function (e) {
        var id = el.getAttribute('data-inst');
        if (e.target.closest('[data-pay]')) sb.from('installments').update({ paid_at: new Date().toISOString() }).eq('id', id).then(ok).then(function () { toast('Parcela marcada como paga'); refreshPills(); reload(); }).catch(fail);
        if (e.target.closest('[data-unpay]')) sb.from('installments').update({ paid_at: null }).eq('id', id).then(ok).then(function () { toast('Pagamento desfeito'); refreshPills(); reload(); }).catch(fail);
      });
    });
  }

  /* =================== PRODUTOS =================== */
  var PRODS = [];
  VIEWS.produtos = function () {
    return sb.from('products').select('*').order('created_at', { ascending: false }).then(function (r) {
      PRODS = ok(r) || [];
      $('#view').innerHTML = '<div class="bar-tools"><input type="search" id="ps" placeholder="Buscar produto" aria-label="Buscar produto"><button class="btn btn-gold btn-sm" type="button" id="np">' + icon('plus') + ' Novo produto</button></div><div id="pl"></div>';
      function draw() {
        var q = $('#ps').value.toLowerCase();
        var l = PRODS.filter(function (p) { return !q || (p.name + p.category).toLowerCase().indexOf(q) >= 0; });
        $('#pl').innerHTML = l.length ? l.map(function (p) {
          return '<div class="prow' + (p.active ? '' : ' off') + '">' + (p.images[0] ? '<img class="thumb0" src="' + MM.img(p.images[0]) + '" alt="">' : '<div class="thumb0"></div>') +
            '<div><h3>' + esc(p.name) + (p.featured ? ' ★' : '') + '</h3><small>' + esc(p.category) + ' · ' + esc(p.gender) + (p.availability === 'encomenda' ? ' · <strong>sob encomenda</strong>' : '') + (p.stock != null ? ' · estoque ' + p.stock : '') + (p.consigned_qty != null ? ' · recebidas ' + p.consigned_qty : '') + (p.active ? '' : ' · oculto') + '</small></div>' +
            '<span class="pr">' + brl(p.promo_cents || p.price_cents) + '</span><div class="acts"><button class="icon-btn" type="button" data-edit="' + p.id + '" aria-label="Editar">' + icon('edit') + '</button><button class="icon-btn" type="button" data-del="' + p.id + '" aria-label="Excluir">' + icon('trash') + '</button></div></div>';
        }).join('') : '<div class="empty">' + (PRODS.length ? 'Nada encontrado.' : 'Nenhum produto ainda. Toque em “Novo produto”.') + '</div>';
      }
      draw();
      $('#ps').addEventListener('input', draw);
      $('#np').addEventListener('click', function () { productForm(null); });
      $('#pl').addEventListener('click', function (e) {
        var ed = e.target.closest('[data-edit]'); if (ed) return productForm(PRODS.filter(function (p) { return p.id === ed.getAttribute('data-edit'); })[0]);
        var del = e.target.closest('[data-del]'); if (!del) return;
        if (del.getAttribute('data-sure') !== '1') { del.setAttribute('data-sure', '1'); del.style.background = '#f7e1df'; toast('Toque de novo na lixeira para excluir'); setTimeout(function () { del.removeAttribute('data-sure'); del.style.background = ''; }, 3000); return; }
        var p = PRODS.filter(function (x) { return x.id === del.getAttribute('data-del'); })[0];
        sb.from('products').delete().eq('id', p.id).then(ok).then(function () {
          if (p.images.length) sb.storage.from(MM_CONFIG.BUCKET).remove(p.images);
          toast('Produto excluído'); VIEWS.produtos();
        }).catch(fail);
      });
    });
  };
  function productForm(p) {
    var isNew = !p; p = p || { sizes: [], colors: [], images: [], active: true };
    var imgs = p.images.slice(), removed = [];
    var cats = []; PRODS.forEach(function (x) { if (cats.indexOf(x.category) < 0) cats.push(x.category); });
    $('#view').innerHTML = '<form class="panel fgrid" id="pForm" novalidate><h3 class="full first">' + (isNew ? 'Novo produto' : 'Editar produto') + '</h3>' +
      '<div class="field full"><label for="f_name">Nome *</label><input id="f_name" name="name" maxlength="120" value="' + esc(p.name || '') + '"></div>' +
      '<div class="field"><label for="f_price">Preço (R$) *</label><input id="f_price" name="price" inputmode="decimal" placeholder="89,90" value="' + money(p.price_cents) + '"></div>' +
      '<div class="field"><label for="f_promo">Preço promocional (R$)</label><input id="f_promo" name="promo" inputmode="decimal" placeholder="opcional" value="' + money(p.promo_cents) + '"></div>' +
      '<div class="field"><label for="f_cat">Categoria *</label><input id="f_cat" name="category" list="catList" placeholder="Camisetas" value="' + esc(p.category || '') + '"><datalist id="catList">' + cats.map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist></div>' +
      '<div class="field"><label for="f_gender">Público</label><select id="f_gender" name="gender">' + ['unissex', 'feminino', 'masculino'].map(function (g) { return '<option value="' + g + '"' + ((p.gender || 'unissex') === g ? ' selected' : '') + '>' + g.charAt(0).toUpperCase() + g.slice(1) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field full"><label for="f_kind">Tipo de venda</label><select id="f_kind" name="availability"><option value="pronta"' + (p.availability !== 'encomenda' ? ' selected' : '') + '>Pronta entrega (tenho a peça)</option><option value="encomenda"' + (p.availability === 'encomenda' ? ' selected' : '') + '>Sob encomenda (busco no fornecedor, preço menor)</option></select><small id="kindHint"></small></div>' +
      '<div class="field"><label for="f_sizes">Tamanhos (separe por vírgula)</label><input id="f_sizes" name="sizes" placeholder="P, M, G, GG" value="' + esc(p.sizes.join(', ')) + '"></div>' +
      '<div class="field"><label for="f_colors">Cores (separe por vírgula)</label><input id="f_colors" name="colors" placeholder="Preto, Off-white" value="' + esc(p.colors.join(', ')) + '"></div>' +
      '<div class="field" data-pronta><label for="f_cons">Recebidas do revendedor</label><input id="f_cons" name="consigned" inputmode="numeric" placeholder="ex.: 5" value="' + (p.consigned_qty == null ? '' : p.consigned_qty) + '"><small>Usado no relatório do repasse.</small></div>' +
      '<div class="field" data-pronta><label for="f_stock">Estoque atual</label><input id="f_stock" name="stock" inputmode="numeric" placeholder="vazio = não controlar" value="' + (p.stock == null ? '' : p.stock) + '"><small>Baixa sozinho quando você confirma uma venda.</small></div>' +
      '<div class="field checks"><label><input type="checkbox" name="active"' + (p.active ? ' checked' : '') + '> Visível no site</label><label><input type="checkbox" name="featured"' + (p.featured ? ' checked' : '') + '> Destaque</label></div>' +
      '<div class="field full"><label for="f_desc">Descrição</label><textarea id="f_desc" name="description" rows="3" maxlength="1500">' + esc(p.description || '') + '</textarea></div>' +
      '<div class="field full"><span class="lbl">Fotos (até 6, a primeira é a capa)</span><div class="uploader"><span id="thumbs" style="display:contents"></span><label class="drop" id="drop"><input type="file" id="fileInput" accept="image/*" multiple hidden>' + icon('image') + '<span id="dropTxt">Adicionar fotos</span></label></div></div>' +
      '<p class="err full" id="pErr" role="alert"></p><div class="full actions"><button class="btn btn-gold" type="submit" id="pSave">Salvar produto</button><button class="btn btn-ghost" type="button" id="pCancel">Cancelar</button></div></form>';
    function thumbs() {
      $('#thumbs').innerHTML = imgs.map(function (path, i) {
        return '<div class="thumb"><img src="' + MM.img(path) + '" alt="Foto ' + (i + 1) + '">' + (i === 0 ? '<span class="cover">CAPA</span>' : '<button type="button" class="left" data-first="' + i + '" aria-label="Usar como capa">★</button>') + '<button type="button" data-rm="' + i + '" aria-label="Remover foto">✕</button></div>';
      }).join('');
      $('#drop').hidden = imgs.length >= 6;
    }
    thumbs();
    function kindUI() { var enc = $('#f_kind').value === 'encomenda'; $$('[data-pronta]').forEach(function (el) { el.hidden = enc; }); $('#kindHint').textContent = enc ? 'Sem controle de estoque. Entra no pedido mínimo de encomendas e na lista “Comprar no fornecedor”.' : 'Controla estoque e entra no relatório do repasse.'; }
    $('#f_kind').addEventListener('change', kindUI); kindUI();
    $('#thumbs').addEventListener('click', function (e) {
      var rm = e.target.closest('[data-rm]'); if (rm) { removed.push(imgs.splice(Number(rm.getAttribute('data-rm')), 1)[0]); thumbs(); }
      var f = e.target.closest('[data-first]'); if (f) { var x = imgs.splice(Number(f.getAttribute('data-first')), 1)[0]; imgs.unshift(x); thumbs(); }
    });
    $('#fileInput').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files).filter(function (f) { return /^image\//.test(f.type); }).slice(0, 6 - imgs.length);
      e.target.value = ''; if (!files.length) return;
      $('#dropTxt').textContent = 'Enviando...'; $('#pErr').textContent = '';
      files.reduce(function (pr, f) {
        return pr.then(function () { return compress(f); }).then(function (b) {
          var path = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)) + (b.type === 'image/webp' ? '.webp' : '.jpg');
          return sb.storage.from(MM_CONFIG.BUCKET).upload(path, b, { contentType: b.type, cacheControl: '31536000' }).then(function (r) { if (r.error) throw r.error; imgs.push(path); thumbs(); });
        });
      }, Promise.resolve()).catch(function (err) { $('#pErr').textContent = 'Não foi possível enviar a foto: ' + err.message; }).then(function () { $('#dropTxt').textContent = 'Adicionar fotos'; });
    });
    $('#pCancel').addEventListener('click', function () { VIEWS.produtos(); });
    $('#pForm').addEventListener('submit', function (e) {
      e.preventDefault(); var f = e.target, err = $('#pErr');
      var name = f.name.value.trim(), price = cents(f.price.value), promo = cents(f.promo.value), cat = f.category.value.trim();
      var stockS = f.stock.value.trim(), consS = f.consigned.value.trim();
      if (name.length < 2) { err.textContent = 'Informe o nome do produto.'; return; }
      if (!price || isNaN(price)) { err.textContent = 'Informe um preço válido (ex.: 89,90).'; return; }
      if (promo !== null && (isNaN(promo) || promo >= price)) { err.textContent = 'O preço promocional deve ser menor que o preço normal.'; return; }
      if (!cat) { err.textContent = 'Informe a categoria.'; return; }
      var kind = f.availability.value;
      var stock = (kind === 'encomenda' || stockS === '') ? null : parseInt(stockS, 10), cons = (kind === 'encomenda' || consS === '') ? null : parseInt(consS, 10);
      if ((stock !== null && (isNaN(stock) || stock < 0)) || (cons !== null && (isNaN(cons) || cons < 0))) { err.textContent = 'Use números inteiros em estoque e quantidade recebida.'; return; }
      var list = function (v) { return v.split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 12); };
      var row = { availability: kind, name: name, price_cents: price, promo_cents: promo, category: cat, gender: f.gender.value, sizes: list(f.sizes.value), colors: list(f.colors.value), stock: stock, consigned_qty: cons, active: f.active.checked, featured: f.featured.checked, description: f.description.value.trim(), images: imgs, updated_at: new Date().toISOString() };
      $('#pSave').disabled = true;
      (isNew ? sb.from('products').insert(row) : sb.from('products').update(row).eq('id', p.id)).then(ok).then(function () {
        if (removed.length) sb.storage.from(MM_CONFIG.BUCKET).remove(removed);
        toast(isNew ? 'Produto cadastrado e já está no site' : 'Produto atualizado'); VIEWS.produtos();
      }).catch(function (er) { err.textContent = er.message; $('#pSave').disabled = false; });
    });
  }
  function compress(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var max = 1400, w = img.naturalWidth, h = img.naturalHeight, r = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * r); c.height = Math.round(h * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b && b.type === 'image/webp') resolve(b); else c.toBlob(function (j) { resolve(j || file); }, 'image/jpeg', 0.85); }, 'image/webp', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  /* =================== REPASSE =================== */
  VIEWS.repasse = function () {
    return Promise.all([sb.rpc('consignment_report'), sb.from('installments').select('amount_cents, paid_at, due_date, orders!inner(status)').neq('orders.status', 'cancelado')]).then(function (r) {
      var rows = ok(r[0]) || [], inst = ok(r[1]) || [];
      var t = rows.reduce(function (a, x) { a.rec += x.consigned_qty || 0; a.sold += Number(x.sold_qty); a.stock += x.stock || 0; a.cents += Number(x.sold_cents); return a; }, { rec: 0, sold: 0, stock: 0, cents: 0 });
      var recebido = inst.filter(function (i) { return i.paid_at; }).reduce(function (s, i) { return s + i.amount_cents; }, 0);
      var aberto = inst.filter(function (i) { return !i.paid_at; }).reduce(function (s, i) { return s + i.amount_cents; }, 0);
      var settle = SETTINGS.settlement_date;
      var depois = settle ? inst.filter(function (i) { return !i.paid_at && i.due_date > settle; }).reduce(function (s, i) { return s + i.amount_cents; }, 0) : 0;
      $('#view').innerHTML =
        '<div class="bar-tools no-print"><span class="muted">' + (settle ? 'Acerto com o revendedor: <strong>' + fmtDate(settle) + '</strong> (altere em Minha loja)' : 'Defina a data do acerto em <button type="button" class="linklike" data-go="loja">Minha loja</button>.') + '</span><button type="button" class="btn btn-dark btn-sm" id="printBtn">Imprimir / salvar PDF</button></div>' +
        '<div class="stats"><div class="stat"><span>Peças vendidas</span><strong>' + t.sold + '</strong></div><div class="stat"><span>Valor vendido</span><strong>' + brl(t.cents) + '</strong></div>' +
        '<div class="stat"><span>Já recebido das clientes</span><strong>' + brl(recebido) + '</strong></div><div class="stat' + (depois ? ' alert' : '') + '"><span>Falta receber' + (depois ? ' (' + brl(depois) + ' depois do acerto)' : '') + '</span><strong>' + brl(aberto) + '</strong></div></div>' +
        '<div class="rep-wrap"><table class="rep"><thead><tr><th>Produto</th><th>Categoria</th><th class="n">Recebidas</th><th class="n">Vendidas</th><th class="n">Sobraram</th><th class="n">Valor vendido</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.category) + '</td><td class="n">' + (x.consigned_qty == null ? '–' : x.consigned_qty) + '</td><td class="n">' + x.sold_qty + '</td><td class="n">' + (x.stock == null ? '–' : x.stock) + '</td><td class="n">' + brl(Number(x.sold_cents)) + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="muted">Cadastre produtos para ver o relatório.</td></tr>') +
        '</tbody><tfoot><tr><td colspan="2">Total</td><td class="n">' + t.rec + '</td><td class="n">' + t.sold + '</td><td class="n">' + t.stock + '</td><td class="n">' + brl(t.cents) + '</td></tr></tfoot></table></div>' +
        '<p class="hint">“Vendidas” conta só pedidos com venda confirmada ou entregue. “Sobraram” é o estoque atual de cada peça.</p>';
      $('#printBtn').addEventListener('click', function () { window.print(); });
    });
  };

  /* =================== COMPRAR NO FORNECEDOR =================== */
  VIEWS.encomendas = function () {
    return sb.rpc('encomenda_report').then(function (r) {
      var rows = ok(r) || [];
      var tq = rows.reduce(function (s, x) { return s + Number(x.qty); }, 0), tc = rows.reduce(function (s, x) { return s + Number(x.total_cents); }, 0);
      $('#view').innerHTML = '<div class="bar-tools no-print"><span class="muted">Peças sob encomenda de vendas <strong>confirmadas</strong> que ainda não foram entregues. Marque o pedido como “entregue” quando a cliente receber.</span><button type="button" class="btn btn-dark btn-sm" id="printEnc">Imprimir / salvar PDF</button></div>' +
        '<div class="rep-wrap"><table class="rep"><thead><tr><th>Peça</th><th>Tamanho</th><th>Cor</th><th class="n">Qtd.</th><th class="n">Vendido por</th><th>Pedidos</th></tr></thead><tbody>' +
        (rows.length ? rows.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.size || '–') + '</td><td>' + esc(x.color || '–') + '</td><td class="n">' + x.qty + '</td><td class="n">' + brl(Number(x.total_cents)) + '</td><td>' + esc(x.orders) + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="muted">Nada para buscar no fornecedor agora.</td></tr>') +
        '</tbody><tfoot><tr><td colspan="3">Total</td><td class="n">' + tq + '</td><td class="n">' + brl(tc) + '</td><td></td></tr></tfoot></table></div>';
      $('#printEnc').addEventListener('click', function () { window.print(); });
    });
  };

  /* =================== MINHA LOJA =================== */
  VIEWS.loja = function () {
    return loadSettings().then(function () {
      var s = SETTINGS;
      function inp(name, label, o) { o = o || {}; return '<div class="field' + (o.full ? ' full' : '') + '"><label for="s_' + name + '">' + label + '</label>' + (o.area ? '<textarea id="s_' + name + '" name="' + name + '" rows="' + (o.rows || 2) + '" placeholder="' + esc(o.ph || '') + '">' + esc(s[name] || '') + '</textarea>' : '<input id="s_' + name + '" name="' + name + '" type="' + (o.type || 'text') + '" placeholder="' + esc(o.ph || '') + '" value="' + esc(s[name] || '') + '"' + (o.num ? ' inputmode="numeric"' : '') + '>') + (o.hint ? '<small>' + o.hint + '</small>' : '') + '</div>'; }
      $('#view').innerHTML = '<form class="panel fgrid" id="sForm" novalidate>' +
        '<h3 class="full first">Contato e pedidos</h3>' +
        inp('whatsapp', 'WhatsApp que recebe os pedidos *', { ph: '5511999999999', num: true, hint: '55 + DDD + número, só números.' }) +
        inp('instagram', 'Instagram', { ph: 'maymodas' }) + inp('email', 'E-mail') +
        inp('address', 'Endereço (opcional)', { hint: 'Deixe vazio se não tiver loja física.' }) +
        inp('hours', 'Horário de atendimento (opcional)', { area: true, full: true, ph: 'Seg a Sex: 9h às 18h' }) +
        '<h3 class="full">Parcelamento e repasse</h3>' +
        '<div class="field"><label for="s_inst">Parcelamento sem cartão</label><select id="s_inst" name="installments_enabled"><option value="1"' + (s.installments_enabled !== false ? ' selected' : '') + '>Sim, oferecer</option><option value="0"' + (s.installments_enabled === false ? ' selected' : '') + '>Não oferecer</option></select><small>A cliente escolhe “parcelado” e você define as parcelas ao confirmar a venda.</small></div>' +
        inp('settlement_date', 'Data do acerto com o revendedor', { type: 'date', hint: 'O painel avisa se alguma parcela vencer depois dessa data.' }) +
        inp('installments_note', 'Aviso que a cliente vê sobre o parcelamento', { area: true, full: true }) +
        '<h3 class="full">Peças sob encomenda</h3>' +
        '<div class="field"><label for="s_enc">Vender sob encomenda</label><select id="s_enc" name="encomenda_enabled"><option value="1"' + (s.encomenda_enabled !== false ? ' selected' : '') + '>Sim</option><option value="0"' + (s.encomenda_enabled === false ? ' selected' : '') + '>Pausar encomendas</option></select></div>' +
        '<div class="field"><label for="s_encmin">Pedido mínimo em encomendas (R$)</label><input id="s_encmin" name="encomenda_min" inputmode="decimal" value="' + money(Number(s.encomenda_min_cents) || 0) + '"><small>Soma só das peças sob encomenda. Use 0 para sem mínimo.</small></div>' +
        inp('encomenda_prazo', 'Prazo estimado de chegada (opcional)', { ph: 'Ex.: 7 a 15 dias úteis' }) +
        inp('encomenda_note', 'Aviso que a cliente vê sobre encomendas', { area: true, full: true }) +
        '<h3 class="full">Textos do site</h3>' +
        inp('store_name', 'Nome da loja') + inp('tagline', 'Frase curta') +
        inp('hero_title', 'Título principal', { full: true }) + inp('hero_subtitle', 'Subtítulo', { area: true, full: true }) +
        inp('about_title', 'Título do “Sobre”') + inp('announcement', 'Faixa de aviso no topo (opcional)', { ph: 'Ex.: Novidades toda semana!' }) +
        inp('about_text', 'Texto do “Sobre”', { area: true, full: true, rows: 4 }) +
        '<p class="err full" id="sErr" role="alert"></p><div class="full actions"><button class="btn btn-gold" type="submit">Salvar</button></div></form>';
      $('#sForm').addEventListener('submit', function (e) {
        e.preventDefault(); var f = e.target, err = $('#sErr'), wa = digits(f.whatsapp.value);
        if (wa && (wa.length < 12 || wa.length > 13)) { err.textContent = 'WhatsApp inválido. Use 55 + DDD + número, ex.: 5511999999999.'; return; }
        var d = Object.assign({}, SETTINGS);
        ['instagram', 'email', 'address', 'hours', 'installments_note', 'store_name', 'tagline', 'hero_title', 'hero_subtitle', 'about_title', 'announcement', 'about_text', 'settlement_date'].forEach(function (k) { d[k] = f[k].value.trim(); });
        d.whatsapp = wa; d.instagram = d.instagram.replace(/^@/, '').replace(/[^\w.]/g, '');
        d.installments_enabled = f.installments_enabled.value === '1';
        d.encomenda_enabled = f.encomenda_enabled.value === '1';
        var mn = String(f.encomenda_min.value).trim() === '' || Number(String(f.encomenda_min.value).replace(',', '.')) === 0 ? 0 : cents(f.encomenda_min.value);
        if (isNaN(mn)) { err.textContent = 'Valor mínimo inválido (ex.: 450,00).'; return; }
        d.encomenda_min_cents = mn; d.encomenda_prazo = f.encomenda_prazo.value.trim(); d.encomenda_note = f.encomenda_note.value.trim();
        if (!d.store_name) d.store_name = 'May Modas';
        if (!d.hero_title) d.hero_title = MM.DEFAULTS.hero_title;
        sb.from('store_settings').update({ data: d, updated_at: new Date().toISOString() }).eq('id', 1).then(ok).then(function () { SETTINGS = d; err.textContent = ''; toast('Salvo! O site já foi atualizado.'); }).catch(function (er) { err.textContent = er.message; });
      });
    });
  };

  /* =================== INÍCIO =================== */
  sb.auth.getSession().then(function (r) {
    if (/type=recovery/.test(location.hash)) return; // tratado pelo evento PASSWORD_RECOVERY
    if (r.data.session) start().catch(function () { showLogin(); }); else showLogin();
  });
})();
