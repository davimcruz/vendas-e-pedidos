const API = 'https://vendas-e-pedidos.onrender.com';
const COLORS = ['Azul', 'Preto', 'Branco']; // ponytail: a API não tem variantes; cor e tamanho são só do front
const SIZES = ['P', 'M', 'G', 'GG'];
const PAGE_SIZE = 18;
const PAYMENTS = [
  { id: 'cartao', label: 'Cartão de crédito', icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>' },
  { id: 'boleto', label: 'Dinheiro / Boleto', icon: '<path d="M5 5v14M8 5v14M12 5v14M15 5v14M19 5v14"/>' },
];
const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};
// próximos status que o admin pode aplicar (espelha as regras da API)
const NEXT_STATUS = {
  aguardando_pagamento: [{ status: 'pago', label: 'Marcar como pago' }, { status: 'cancelado', label: 'Cancelar' }],
  pago: [{ status: 'enviado', label: 'Marcar como enviado' }, { status: 'cancelado', label: 'Cancelar' }],
  enviado: [],
  cancelado: [],
};
// a API não tem imagens: o produto é uma caixa ilustrada, sobre 3 tons do azul
const BOX = '<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M60 14l42 21-42 21-42-21z" fill="#fff"/><path d="M18 35l42 21v50L18 85z" fill="rgb(121,177,240)"/><path d="M102 35L60 56v50l42-21z" fill="rgb(121,177,240)"/><path d="M102 35L60 56v50l42-21z" fill="#000" opacity=".16"/><path d="M39 24.5l42 21v12l-42-21z" fill="#000" opacity=".1"/></svg>';

const view = document.getElementById('view');
const dialog = document.getElementById('dialog');
const money = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
const read = (key, fallback) => JSON.parse(localStorage.getItem(key)) ?? fallback;
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const thumb = (id) => `<div class="thumb tone-${id % 3}" aria-hidden="true">${BOX}</div>`;
const statusBadge = (status) => `<span class="status status-${status}">${STATUS_LABELS[status]}</span>`;
const isAdmin = () => session?.cliente.perfil === 'admin';

let session = read('session', null);
let cart = read('cart', []);
let checkout = { frete: null, cupom: null, pagamento: null };

function saveCart() {
  write('cart', cart);
  const count = cart.reduce((sum, line) => sum + line.quantidade, 0);
  const badge = document.getElementById('cart-count');
  badge.hidden = count === 0;
  badge.textContent = count;
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (session) headers.Authorization = `Bearer ${session.token}`;
  let response;
  try {
    response = await fetch(API + path, { ...options, headers });
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.');
  }
  const body = response.status === 204 ? null : await response.json();
  const isLoginAttempt = path === '/auth/login' || path === '/auth/cadastro';
  if (response.status === 401 && session && !isLoginAttempt) {
    logout();
    throw new Error('Sua sessão expirou. Entre novamente.');
  }
  if (!response.ok) throw new Error(body.erro?.mensagem ?? 'Algo deu errado.');
  return body;
}

function logout() {
  session = null;
  cart = [];
  localStorage.removeItem('session');
  saveCart();
  location.hash = '#/login';
}

function showError(container, error) {
  container.innerHTML = `<p class="error" role="alert">${escapeHtml(error.message)}</p>`;
}

let toastTimer;
function toast(message) {
  const box = document.getElementById('toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; }, 3500);
}

/** Abre o diálogo com um formulário; onSubmit recebe os dados e, se lançar erro, ele aparece no diálogo. */
function openDialog(title, bodyHtml, onSubmit, submitLabel = 'Salvar') {
  dialog.innerHTML = `
    <form id="dialog-form">
      <h2>${title}</h2>
      ${bodyHtml}
      <div id="dialog-error"></div>
      <div class="dialog-actions">
        <button type="button" id="dialog-cancel">Cancelar</button>
        <button type="submit" class="primary">${submitLabel}</button>
      </div>
    </form>`;
  document.getElementById('dialog-cancel').onclick = () => dialog.close();
  document.getElementById('dialog-form').onsubmit = async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('[type=submit]');
    button.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(event.target)));
      dialog.close();
    } catch (error) {
      showError(document.getElementById('dialog-error'), error);
      button.disabled = false;
    }
  };
  dialog.showModal();
}

function confirmAction(title, text, label) {
  return new Promise((resolve) => {
    let confirmed = false;
    openDialog(title, `<p>${text}</p>`, async () => { confirmed = true; }, label);
    dialog.addEventListener('close', () => resolve(confirmed), { once: true });
  });
}

/** Muda o status de um pedido (admin) e avisa quando o estoque é afetado. */
async function changeOrderStatus(orderId, status) {
  const messages = {
    pago: 'Ao marcar como pago, a quantidade dos itens sai do estoque.',
    cancelado: 'Pedidos pagos devolvem os itens ao estoque. Este cancelamento não pode ser desfeito.',
  };
  if (messages[status] && !(await confirmAction(`${STATUS_LABELS[status]}: pedido #${orderId}`, messages[status], 'Confirmar'))) {
    return false;
  }
  await api(`/pedidos/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  toast(`Pedido #${orderId} atualizado: ${STATUS_LABELS[status].toLowerCase()}.`);
  return true;
}

// ---------- autenticação ----------

function renderAuth(mode) {
  const signup = mode === 'cadastro';
  view.innerHTML = `
    <section class="auth-split">
      <div class="auth-brand">
        <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8zm3 0a3 3 0 016 0"/></svg>
        <h1>UP Shoop</h1>
        <p>Escolha, aplique o cupom e finalize a compra em poucos toques.</p>
      </div>
      <div class="auth">
        <h2>${signup ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
        <form id="auth-form" novalidate>
          ${signup ? '<div class="field"><label for="nome">Nome</label><input id="nome" name="nome" autocomplete="name" required minlength="2" maxlength="120" /></div>' : ''}
          <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required /></div>
          <div class="field"><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="8" maxlength="72" />${signup ? '<p class="hint">De 8 a 72 caracteres.</p>' : ''}</div>
          <div id="auth-error"></div>
          <button class="primary wide" type="submit">${signup ? 'Cadastre-se' : 'Entrar'}</button>
        </form>
        <div class="alt"><span class="hint">ou</span><a class="button" href="#/${signup ? 'login' : 'cadastro'}">${signup ? 'Já tenho conta' : 'Cadastre-se'}</a></div>
      </div>
    </section>`;
  document.getElementById('auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const errorBox = document.getElementById('auth-error');
    const button = form.querySelector('button');
    errorBox.innerHTML = '';
    if (!form.checkValidity()) {
      showError(errorBox, new Error('Preencha todos os campos corretamente (e-mail válido, senha de 8 a 72 caracteres).'));
      return;
    }
    button.disabled = true;
    button.textContent = 'Aguarde…';
    const slowHint = setTimeout(() => {
      errorBox.innerHTML = '<p class="hint">O servidor estava dormindo e pode levar até 1 minuto para acordar.</p>';
    }, 5000);
    try {
      const data = Object.fromEntries(new FormData(form));
      session = await api(signup ? '/auth/cadastro' : '/auth/login', { method: 'POST', body: JSON.stringify(data) });
      write('session', session);
      location.hash = '#/';
    } catch (error) {
      showError(errorBox, error);
      button.disabled = false;
      button.textContent = signup ? 'Cadastre-se' : 'Entrar';
    } finally {
      clearTimeout(slowHint);
    }
  });
}

// ---------- catálogo ----------

async function renderCatalog(query) {
  const params = new URLSearchParams(query);
  const page = Number(params.get('pagina')) || 1;
  // mantém busca e preço atuais e troca só o que mudou (sempre volta para a página 1)
  const catalogLink = (changes) => {
    const next = new URLSearchParams(query);
    next.delete('pagina');
    Object.entries(changes).forEach(([key, value]) => (value === null ? next.delete(key) : next.set(key, value)));
    return '#/?' + next;
  };
  const ranges = [
    { label: 'Todos', min: null, max: null },
    { label: 'Até R$ 100', min: null, max: 100 },
    { label: 'R$ 100 a R$ 500', min: 100, max: 500 },
    { label: 'Acima de R$ 500', min: 500, max: null },
  ];
  const isRange = (range) => Number(params.get('precoMin')) === (range.min ?? 0) && Number(params.get('precoMax') ?? 0) === (range.max ?? 0);
  view.innerHTML = `
    <section class="hero">
      <h1>Encontre, escolha e finalize em poucos toques</h1>
      <form class="hero-search" id="hero-search" role="search">
        <input type="search" name="busca" aria-label="Buscar produtos" placeholder="O que você procura?" value="${escapeHtml(params.get('busca') ?? '')}" />
        <button class="dark" type="submit">Buscar</button>
      </form>
    </section>
    <div class="catalog">
      <details class="filters">
        <summary>Filtros</summary>
        <form class="filters-body" id="filters-form">
          <div><label for="precoMin">Preço mínimo (R$)</label><input id="precoMin" name="precoMin" type="number" min="0" step="any" value="${escapeHtml(params.get('precoMin') ?? '')}" /></div>
          <div><label for="precoMax">Preço máximo (R$)</label><input id="precoMax" name="precoMax" type="number" min="0" step="any" value="${escapeHtml(params.get('precoMax') ?? '')}" /></div>
          <button class="primary" type="submit">Aplicar filtros</button>
          <a class="button" href="#/">Limpar</a>
        </form>
      </details>
      <section aria-live="polite">
        <div class="results-head"><h2>Produtos</h2><span class="hint" id="count"></span></div>
        <nav class="chips" aria-label="Faixa de preço">${ranges.map((range) =>
          `<a class="chip" href="${catalogLink({ precoMin: range.min, precoMax: range.max })}" ${isRange(range) ? 'aria-current="true"' : ''}>${range.label}</a>`).join('')}</nav>
        <div id="catalog-result"><p class="hint">Carregando… (o servidor pode levar até 1 minuto na primeira vez)</p></div>
      </section>
    </div>`;
  document.querySelector('.filters').open = matchMedia('(min-width: 1025px)').matches;
  document.getElementById('filters-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const { precoMin, precoMax } = Object.fromEntries(new FormData(event.target));
    location.hash = catalogLink({ precoMin: precoMin || null, precoMax: precoMax || null });
  });
  document.getElementById('hero-search').addEventListener('submit', (event) => {
    event.preventDefault();
    location.hash = catalogLink({ busca: new FormData(event.target).get('busca').trim() || null });
  });

  const result = document.getElementById('catalog-result');
  try {
    params.set('pagina', page);
    params.set('limite', PAGE_SIZE);
    const { dados, paginacao } = await api('/produtos?' + params);
    document.getElementById('count').textContent = `${paginacao.total} ${paginacao.total === 1 ? 'produto' : 'produtos'}`;
    if (dados.length === 0) {
      result.innerHTML = `<div class="empty">${thumb(0)}<p>Nenhum produto encontrado. Tente outra busca ou limpe os filtros.</p><a class="button" href="#/">Ver todos os produtos</a></div>`;
      return;
    }
    const pages = Math.ceil(paginacao.total / paginacao.limite);
    const link = (target) => {
      const next = new URLSearchParams(query);
      next.set('pagina', target);
      return '#/?' + next;
    };
    const stockTag = (stock) => {
      if (stock === 0) return '<div class="tag">Esgotado</div>';
      if (stock <= 5) return '<div class="tag">Últimas unidades</div>';
      return '';
    };
    result.innerHTML = `
      <ul class="grid">${dados.map((product) => `
        <li><a class="card" href="#/produto/${product.id}">
          ${thumb(product.id)}
          <div class="card-info"><strong>${escapeHtml(product.nome)}</strong><span class="price">${money(product.preco)}</span>
          ${stockTag(product.quantidadeEstoque)}</div>
        </a></li>`).join('')}</ul>
      ${pages > 1 ? `<nav class="pager" aria-label="Paginação">
        ${page > 1 ? `<a class="button" href="${link(page - 1)}">Anterior</a>` : ''}
        <span>Página ${page} de ${pages}</span>
        ${page < pages ? `<a class="button" href="${link(page + 1)}">Próxima</a>` : ''}</nav>` : ''}`;
  } catch (error) {
    showError(result, error);
  }
}

async function renderProduct(id) {
  view.innerHTML = '<p class="hint">Carregando…</p>';
  try {
    const product = await api(`/produtos/${encodeURIComponent(id)}`);
    const stock = product.quantidadeEstoque ?? 0;
    const inCart = cart.filter((line) => line.produtoId === product.id).reduce((sum, line) => sum + line.quantidade, 0);
    const available = Math.max(stock - inCart, 0); // RN02
    const options = (name, values) => values.map((value, index) =>
      `<label><input type="radio" name="${name}" value="${value}" ${index === 0 ? 'checked' : ''} /><span>${value}</span></label>`).join('');
    view.innerHTML = `
      <a class="back" href="#/">← Voltar aos produtos</a>
      <article class="product">
        ${thumb(product.id)}
        <form id="product-form">
          <h1>${escapeHtml(product.nome)}</h1>
          <p class="product-price">${money(product.preco)}</p>
          <p>${escapeHtml(product.descricao ?? '')}</p>
          ${available === 0
            ? '<p class="error">Sem estoque disponível.</p>'
            : `<p class="hint">${available} ${available === 1 ? 'unidade disponível' : 'unidades disponíveis'}</p>`}
          <fieldset><legend>Cor</legend><div class="options">${options('cor', COLORS)}</div></fieldset>
          <fieldset><legend>Tamanho</legend><div class="options">${options('tamanho', SIZES)}</div></fieldset>
          <div class="field"><label>Quantidade</label>
            <div class="stepper">
              <button type="button" id="minus" aria-label="Diminuir quantidade">−</button>
              <output id="qty" aria-live="polite">1</output>
              <button type="button" id="plus" aria-label="Aumentar quantidade">+</button>
            </div></div>
          <button class="primary wide" type="submit" ${available === 0 ? 'disabled' : ''}>Adicionar ao carrinho</button>
        </form>
      </article>`;
    let quantity = available === 0 ? 0 : 1;
    const quantityOutput = document.getElementById('qty');
    const plus = document.getElementById('plus');
    const minus = document.getElementById('minus');
    const refresh = () => {
      quantityOutput.textContent = quantity;
      minus.disabled = quantity <= 1;
      plus.disabled = quantity >= available;
    };
    minus.onclick = () => { quantity -= 1; refresh(); };
    plus.onclick = () => { quantity += 1; refresh(); };
    refresh();
    document.getElementById('product-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const { cor, tamanho } = Object.fromEntries(new FormData(event.target));
      const existing = cart.find((line) => line.produtoId === product.id && line.cor === cor && line.tamanho === tamanho);
      if (existing) {
        existing.quantidade += quantity;
      } else {
        cart.push({ produtoId: product.id, nome: product.nome, preco: product.preco, estoque: stock, cor, tamanho, quantidade: quantity });
      }
      saveCart();
      location.hash = '#/carrinho';
    });
  } catch (error) {
    showError(view, error);
  }
}

// ---------- carrinho e checkout ----------

function cartTotals() {
  const subtotal = cart.reduce((sum, line) => sum + line.preco * line.quantidade, 0);
  const coupon = checkout.cupom;
  let discount = 0;
  if (coupon) {
    discount = coupon.tipo === 'percentual' ? (subtotal * coupon.desconto) / 100 : coupon.desconto;
  }
  discount = Math.min(discount, subtotal);
  return { subtotal, discount, frete: checkout.frete ?? 0, total: subtotal - discount + (checkout.frete ?? 0) };
}

function renderCart() {
  if (cart.length === 0) {
    view.innerHTML = `<div class="empty">${thumb(1)}<h1>Seu carrinho está vazio</h1><p>Escolha um produto para começar.</p><a class="button primary" href="#/">Ver produtos</a></div>`;
    return;
  }
  const quantityOf = (produtoId) => cart.filter((line) => line.produtoId === produtoId).reduce((sum, line) => sum + line.quantidade, 0);
  view.innerHTML = `
    <div class="page-head"><h1>Carrinho</h1></div>
    <div class="cart-layout"><div>${cart.map((line, index) => `
      <div class="cart-line">
        ${thumb(line.produtoId)}
        <div><strong>${escapeHtml(line.nome)}</strong><br /><span class="hint">${line.cor} · ${line.tamanho}</span><br /><span class="price">${money(line.preco)}</span></div>
        <div class="row">
          <div class="stepper">
            <button type="button" data-action="minus" data-index="${index}" aria-label="Diminuir quantidade de ${escapeHtml(line.nome)}" ${line.quantidade <= 1 ? 'disabled' : ''}>−</button>
            <output>${line.quantidade}</output>
            <button type="button" data-action="plus" data-index="${index}" aria-label="Aumentar quantidade de ${escapeHtml(line.nome)}" ${quantityOf(line.produtoId) >= line.estoque ? 'disabled' : ''}>+</button>
          </div>
          <button type="button" class="quiet" data-action="remove" data-index="${index}" aria-label="Remover produto do carrinho">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
          </button>
        </div>
      </div>`).join('')}</div>
    <aside class="block">
      <h2>Resumo</h2>
      <div class="summary-row total"><span>Subtotal</span><span>${money(cartTotals().subtotal)}</span></div>
      <p class="hint">Frete e cupom são calculados no próximo passo.</p>
      <a class="button primary wide" href="#/checkout">Continuar para o pagamento</a>
    </aside></div>`;
  view.onclick = (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.dataset.action === 'plus') cart[index].quantidade += 1;
    if (button.dataset.action === 'minus') cart[index].quantidade -= 1;
    if (button.dataset.action === 'remove') cart.splice(index, 1);
    saveCart();
    renderCart();
  };
}

// ponytail: frete simulado no front (a API não calcula); valor fixo por região do CEP
function simulateShipping(cep) {
  return 12 + Number(cep[0]) * 3.5;
}

function renderCheckout() {
  if (cart.length === 0) { // RN03
    location.hash = '#/carrinho';
    return;
  }
  view.innerHTML = `
    <div class="page-head"><h1>Finalizar compra</h1></div>
    <div class="checkout">
      <div>
        <section class="block" aria-labelledby="h-frete"><h2 id="h-frete"><span class="step-number">1</span>Frete</h2>
          <form class="inline-form" id="frete-form" novalidate>
            <input id="cep" inputmode="numeric" maxlength="9" placeholder="CEP (ex.: 01310-100)" aria-label="CEP" autocomplete="postal-code" />
            <button type="submit">Calcular</button>
          </form><div id="frete-msg" aria-live="polite"></div></section>
        <section class="block" aria-labelledby="h-cupom"><h2 id="h-cupom"><span class="step-number">2</span>Cupom de desconto</h2>
          <form class="inline-form" id="cupom-form">
            <input id="cupom" placeholder="Código do cupom" aria-label="Código do cupom" />
            <button type="submit">Aplicar</button>
          </form><div id="cupom-msg" aria-live="polite"></div></section>
        <section class="block" aria-labelledby="h-pag"><h2 id="h-pag"><span class="step-number">3</span>Pagamento</h2>
          <div class="pay-options" role="radiogroup" aria-label="Método de pagamento">${PAYMENTS.map((payment) => `
            <label><input type="radio" name="pagamento" value="${payment.id}" /><span>
              <svg viewBox="0 0 24 24" aria-hidden="true">${payment.icon}</svg>${payment.label}</span></label>`).join('')}</div></section>
      </div>
      <section class="block" aria-labelledby="h-resumo"><h2 id="h-resumo">Resumo</h2>
        <div id="summary"></div><div id="checkout-error"></div>
        <button class="primary wide" id="finish" type="button">Finalizar compra</button></section>
    </div>`;

  const summary = document.getElementById('summary');
  const paintSummary = () => {
    const totals = cartTotals();
    summary.innerHTML = `
      ${cart.map((line) => `<div class="summary-row"><span>${line.quantidade}× ${escapeHtml(line.nome)} (${line.cor}, ${line.tamanho})</span><span>${money(line.preco * line.quantidade)}</span></div>`).join('')}
      <div class="summary-row"><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
      <div class="summary-row"><span>Desconto${checkout.cupom ? ` (${escapeHtml(checkout.cupom.codigo)})` : ''}</span><span>− ${money(totals.discount)}</span></div>
      <div class="summary-row"><span>Frete</span><span>${checkout.frete === null ? 'a calcular' : money(totals.frete)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${money(totals.total)}</span></div>`;
  };
  paintSummary();

  document.getElementById('frete-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const cep = document.getElementById('cep').value.replace(/\D/g, '');
    const message = document.getElementById('frete-msg');
    if (cep.length !== 8) {
      checkout.frete = null;
      showError(message, new Error('CEP inválido. Digite os 8 números do CEP.'));
    } else {
      checkout.frete = simulateShipping(cep);
      message.innerHTML = `<p>Frete: <strong>${money(checkout.frete)}</strong></p>`;
    }
    paintSummary();
  });

  document.getElementById('cupom-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.getElementById('cupom-msg');
    const code = document.getElementById('cupom').value.trim();
    if (!code) return;
    try {
      checkout.cupom = await api('/cupons/validar', { method: 'POST', body: JSON.stringify({ codigo: code }) });
      message.innerHTML = `<p>Cupom <strong>${escapeHtml(checkout.cupom.codigo)}</strong> aplicado.</p>`;
    } catch (error) {
      checkout.cupom = null;
      showError(message, error);
    }
    paintSummary();
  });

  document.querySelectorAll('[name=pagamento]').forEach((input) => {
    input.addEventListener('change', () => { checkout.pagamento = input.value; });
  });

  document.getElementById('finish').addEventListener('click', async (event) => {
    const errorBox = document.getElementById('checkout-error');
    errorBox.innerHTML = '';
    if (checkout.frete === null) return showError(errorBox, new Error('Calcule o frete informando o CEP.'));
    if (!checkout.pagamento) return showError(errorBox, new Error('Selecione um método de pagamento.')); // RN05
    const button = event.target;
    button.disabled = true;
    try {
      // a API aceita um item por produto: soma as variantes do mesmo produto
      const quantities = new Map();
      cart.forEach((line) => quantities.set(line.produtoId, (quantities.get(line.produtoId) ?? 0) + line.quantidade));
      const order = await api('/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          clienteId: session.cliente.id,
          itens: [...quantities].map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
          frete: checkout.frete,
          cupom: checkout.cupom?.codigo ?? null,
        }),
      });
      cart = [];
      checkout = { frete: null, cupom: null, pagamento: null };
      saveCart();
      location.hash = `#/pedido/${order.id}?novo=1`;
    } catch (error) {
      showError(errorBox, error);
      button.disabled = false;
    }
  });
}

// ---------- pedidos ----------

async function renderOrders() {
  view.innerHTML = '<div class="page-head"><h1>Meus pedidos</h1></div><div id="orders"><p class="hint">Carregando…</p></div>';
  const box = document.getElementById('orders');
  try {
    const orders = await api(`/pedidos?clienteId=${session.cliente.id}`);
    box.innerHTML = orders.length === 0
      ? `<div class="empty">${thumb(2)}<p>Você ainda não fez pedidos.</p><a class="button primary" href="#/">Ver produtos</a></div>`
      : orders.map((order) => `
        <a class="order-row" href="#/pedido/${order.id}"><strong>Pedido #${order.id}</strong>${statusBadge(order.status)}<span class="order-total">${money(order.valorTotal)}</span></a>`).join('');
  } catch (error) {
    showError(box, error);
  }
}

function orderSteps(status) {
  if (status === 'cancelado') return '<div class="banner">Este pedido foi cancelado.</div>';
  const order = ['aguardando_pagamento', 'pago', 'enviado'];
  const current = order.indexOf(status);
  return `<ol class="steps" aria-label="Andamento do pedido">${order.map((step, index) => {
    let state = '';
    if (index < current) state = 'done';
    if (index === current) state = 'current';
    return `<li class="${state}" ${state === 'current' ? 'aria-current="step"' : ''}>${STATUS_LABELS[step]}</li>`;
  }).join('')}</ol>`;
}

async function renderOrder(id, query) {
  view.innerHTML = '<p class="hint">Carregando…</p>';
  try {
    const order = await api(`/pedidos/${encodeURIComponent(id)}`);
    const isNew = new URLSearchParams(query).get('novo');
    const waiting = order.status === 'aguardando_pagamento';
    const adminActions = isAdmin() ? NEXT_STATUS[order.status].map((next) =>
      `<button type="button" class="${next.status === 'cancelado' ? '' : 'primary'}" data-status="${next.status}">${next.label}</button>`).join('') : '';
    const customerActions = !isAdmin() && waiting
      ? '<button type="button" id="edit-order">Editar itens</button><button type="button" id="cancel-order">Cancelar pedido</button>' : '';
    view.innerHTML = `
      <a class="back" href="${isAdmin() ? '#/admin/pedidos' : '#/pedidos'}">← Voltar aos pedidos</a>
      ${isNew ? '<div class="banner"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>Pedido registrado! Acompanhe o andamento por aqui.</div>' : ''}
      <div class="page-head"><h1>Pedido #${order.id}</h1>${statusBadge(order.status)}</div>
      ${orderSteps(order.status)}
      <div class="order-layout">
        <div>${(order.itens ?? []).map((item) => `
          <div class="cart-line">${thumb(item.produtoId)}
            <div><strong>${escapeHtml(item.nome)}</strong><br /><span class="hint">${item.quantidade} × ${money(item.precoUnitario)}</span></div>
            <div class="price right">${money(item.quantidade * item.precoUnitario)}</div></div>`).join('')}</div>
        <aside class="block">
          <h2>Resumo</h2>
          <div class="summary-row"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
          <div class="summary-row"><span>Desconto${order.cupom ? ` (${escapeHtml(order.cupom)})` : ''}</span><span>− ${money(order.desconto)}</span></div>
          <div class="summary-row"><span>Frete</span><span>${money(order.frete)}</span></div>
          <div class="summary-row total"><span>Total</span><span>${money(order.valorTotal)}</span></div>
          ${!isAdmin() && waiting ? '<p class="hint">Aguardando a confirmação do pagamento pela loja.</p>' : ''}
          <div class="actions" id="order-actions">${adminActions}${customerActions}</div>
        </aside>
      </div>`;
    document.getElementById('order-actions').addEventListener('click', async (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      try {
        if (button.dataset.status && (await changeOrderStatus(order.id, button.dataset.status))) renderOrder(id, '');
        if (button.id === 'edit-order') renderOrderEditor(order);
        if (button.id === 'cancel-order' && (await confirmAction(`Cancelar pedido #${order.id}?`, 'Este cancelamento não pode ser desfeito.', 'Cancelar pedido'))) {
          await api(`/pedidos/${order.id}`, { method: 'DELETE' });
          toast(`Pedido #${order.id} cancelado.`);
          renderOrder(id, '');
        }
      } catch (error) {
        toast(error.message);
      }
    });
  } catch (error) {
    showError(view, error);
  }
}

/** Edita itens e cupom de um pedido aguardando pagamento (PUT /pedidos/:id). */
async function renderOrderEditor(order) {
  view.innerHTML = '<p class="hint">Carregando…</p>';
  try {
    const stocks = await Promise.all(order.itens.map((item) => api(`/produtos/${item.produtoId}`)));
    const lines = order.itens.map((item, index) => ({ ...item, estoque: stocks[index].quantidadeEstoque }));
    const paint = () => {
      view.innerHTML = `
        <a class="back" href="#/pedido/${order.id}">← Voltar ao pedido</a>
        <div class="page-head"><h1>Editar pedido #${order.id}</h1></div>
        <div class="order-layout">
          <div>${lines.map((line, index) => `
            <div class="edit-line"><div><strong>${escapeHtml(line.nome)}</strong><br /><span class="hint">${money(line.precoUnitario)} · ${line.estoque} em estoque</span></div>
              <div class="stepper">
                <button type="button" data-action="minus" data-index="${index}" aria-label="Diminuir quantidade de ${escapeHtml(line.nome)}" ${line.quantidade <= 1 ? 'disabled' : ''}>−</button>
                <output>${line.quantidade}</output>
                <button type="button" data-action="plus" data-index="${index}" aria-label="Aumentar quantidade de ${escapeHtml(line.nome)}" ${line.quantidade >= line.estoque ? 'disabled' : ''}>+</button>
                <button type="button" class="quiet" data-action="remove" data-index="${index}" aria-label="Remover ${escapeHtml(line.nome)} do pedido" ${lines.length === 1 ? 'disabled' : ''}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
              </div></div>`).join('')}</div>
          <form class="block" id="edit-form">
            <h2>Cupom e frete</h2>
            <div class="field"><label for="edit-cupom">Cupom (deixe vazio para remover)</label><input id="edit-cupom" name="cupom" value="${escapeHtml(order.cupom ?? '')}" /></div>
            <p class="hint">Frete mantido: ${money(order.frete)}</p>
            <div id="edit-error"></div>
            <button class="primary wide" type="submit">Salvar alterações</button>
          </form>
        </div>`;
      document.getElementById('edit-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = event.target.querySelector('[type=submit]');
        button.disabled = true;
        try {
          await api(`/pedidos/${order.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              itens: lines.map(({ produtoId, quantidade }) => ({ produtoId, quantidade })),
              frete: order.frete,
              cupom: new FormData(event.target).get('cupom').trim() || null,
            }),
          });
          toast(`Pedido #${order.id} atualizado.`);
          renderOrder(order.id, '');
        } catch (error) {
          showError(document.getElementById('edit-error'), error);
          button.disabled = false;
        }
      });
    };
    paint();
    view.onclick = (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const index = Number(button.dataset.index);
      if (button.dataset.action === 'plus') lines[index].quantidade += 1;
      if (button.dataset.action === 'minus') lines[index].quantidade -= 1;
      if (button.dataset.action === 'remove') lines.splice(index, 1);
      paint();
    };
  } catch (error) {
    showError(view, error);
  }
}

// ---------- rotas ----------

function route() {
  const [path, query = ''] = location.hash.slice(1).split('?');
  const isAuthRoute = path === '/login' || path === '/cadastro';
  if (!session && !isAuthRoute) { // RF01
    location.hash = '#/login';
    return;
  }
  if (session && isAuthRoute) {
    location.hash = '#/';
    return;
  }
  const [, section, id] = path.split('/');
  if (section === 'admin' && !isAdmin()) {
    location.hash = '#/';
    return;
  }
  document.getElementById('topbar').hidden = !session;
  document.getElementById('menu-panel').hidden = true;
  view.onclick = null;
  window.scrollTo(0, 0);
  if (session) {
    document.getElementById('menu-user').textContent = session.cliente.nome;
    document.getElementById('menu-admin').hidden = !isAdmin();
  }
  if (path === '/login') return renderAuth('login');
  if (path === '/cadastro') return renderAuth('cadastro');
  if (section === 'produto') return renderProduct(id);
  if (section === 'carrinho') return renderCart();
  if (section === 'checkout') return renderCheckout();
  if (section === 'pedido') return renderOrder(id, query);
  if (section === 'pedidos') return renderOrders();
  if (section === 'admin') return renderAdmin(id, query);
  renderCatalog(query);
}

/** Confirma a sessão no servidor; se o perfil mudou, a tela é redesenhada. */
async function verifySession() {
  try {
    const client = await api('/auth/me');
    const profileChanged = client.perfil !== session.cliente.perfil;
    session.cliente = client;
    write('session', session);
    if (profileChanged) route();
  } catch {
    // 401 já fez logout dentro de api()
  }
}

document.getElementById('menu-button').addEventListener('click', (event) => {
  const panel = document.getElementById('menu-panel');
  panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
});
document.getElementById('logout-button').addEventListener('click', logout);
document.getElementById('topbar-search').addEventListener('submit', (event) => {
  event.preventDefault();
  const busca = document.getElementById('topbar-search-input').value.trim();
  location.hash = busca ? '#/?' + new URLSearchParams({ busca }) : '#/';
});
window.addEventListener('hashchange', route);
saveCart();
route();
if (session) verifySession();
