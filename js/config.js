// Conexão com o Supabase (chave pública: pode ficar no navegador; a segurança
// fica nas regras do banco). Não coloque aqui a chave "service_role".
window.MM_CONFIG = {
  SUPABASE_URL: 'https://xfbtqwkxbkqwuptftvxz.supabase.co',
  SUPABASE_KEY: 'sb_publishable_ejHmLla-W4SKtxgZhamv1w_esDRuRFX',
  BUCKET: 'produtos'
};
window.MM = (function () {
  var c = window.MM_CONFIG;
  var sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_KEY);
  function img(path) {
    if (!path) return '';
    if (/^(https?:|assets\/)/.test(path)) return path;
    return c.SUPABASE_URL + '/storage/v1/object/public/' + c.BUCKET + '/' + path.split('/').map(encodeURIComponent).join('/');
  }
  var DEFAULTS = {
    store_name: 'May Modas', tagline: 'Moda unissex', logo: '',
    whatsapp: '', instagram: '', email: '', address: '', hours: '',
    installments_enabled: true,
    installments_note: 'A quantidade de parcelas e as datas de pagamento dependem da época da compra. A lojista vai te informar em quantas vezes você pode pagar.',
    hero_title: 'Estilo sem rótulos. Do seu jeito.',
    hero_subtitle: 'Peças unissex para todos os momentos. Escolha o que ama, monte sua sacola e finalize direto no WhatsApp com a gente.',
    about_title: 'A May Modas',
    about_text: 'A May Modas nasce com uma ideia simples: roupa boa não precisa ter gênero. Selecionamos peças confortáveis, atuais e com personalidade para quem quer se vestir sem regras.',
    announcement: '',
    encomenda_enabled: true,
    encomenda_min_cents: 45000,
    encomenda_prazo: '',
    encomenda_note: 'Peças sob encomenda são buscadas direto no fornecedor depois do seu pedido, por isso saem mais em conta. O prazo de chegada é combinado com a lojista.'
  };
  function brl(c) { return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function digits(v) { return String(v || '').replace(/\D/g, ''); }
  function formatPhone(d) { d = digits(d); var m = d.match(/^(?:55)?(\d{2})(\d{4,5})(\d{4})$/); return m ? '(' + m[1] + ') ' + m[2] + '-' + m[3] : d; }
  return { sb: sb, img: img, DEFAULTS: DEFAULTS, brl: brl, esc: esc, digits: digits, formatPhone: formatPhone };
})();
