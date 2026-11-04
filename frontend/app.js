const API = 'https://vendas-e-pedidos.onrender.com';
const COLORS = ['Azul', 'Preto', 'Branco']; // ponytail: a API não tem variantes; cor e tamanho são só do front
const SIZES = ['P', 'M', 'G', 'GG'];
const PAGE_SIZE = 18;
const PAYMENTS = [
  { id: 'cartao', label: 'Cartão de crédito', icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>' },
  { id: 'boleto', label: 'Dinheiro / Boleto', icon: '<path d="M5 5v14M8 5v14M12 5v14M15 5v14M19 5v14"/>' },
];
const SHIRT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4L3 7l2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 01-8 0z"/></svg>';

const view = document.getElementById('view');
const money = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
const read = (key, fallback) => JSON.parse(localStorage.getItem(key)) ?? fallback;
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

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
  const response = await fetch(API + path, { ...options, headers });
  const body = response.status === 204 ? null : await response.json();
  if (response.status === 401 && session && !path.startsWith('/auth')) {
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

// ---------- telas ----------

function renderAuth(mode) {
  const signup = mode === 'cadastro';
  view.innerHTML = `
    <section class="auth">
      <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l1 12H5L6 8zm3 0a3 3 0 016 0"/></svg>
      <h1>UP Shoop</h1>
      <h2>${signup ? 'Cadastre-se' : 'Entre'}</h2>
      <form id="auth-form" novalidate>
        ${signup ? '<div class="field"><label for="nome">Nome</label><input id="nome" name="nome" autocomplete="name" required minlength="2" maxlength="120" /></div>' : ''}
        <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required /></div>
        <div class="field"><label for="senha">Senha</label><input id="senha" name="senha" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="8" maxlength="72" />${signup ? '<p class="hint">De 8 a 72 caracteres.</p>' : ''}</div>
        <div id="auth-error"></div>
        <button class="primary" type="submit">${signup ? 'Cadastre-se' : 'Entrar'}</button>
      </form>
      <div class="alt"><span class="hint">ou</span><a class="button" href="#/${signup ? 'login' : 'cadastro'}">${signup ? 'Já tenho conta' : 'Cadastre-se'}</a></div>
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
    button.textContent = 'Aguarde… (o servidor pode levar até 1 minuto para acordar)';
    try {
      const data = Object.fromEntries(new FormData(form));
      session = await api(signup ? '/auth/cadastro' : '/auth/login', { method: 'POST', body: JSON.stringify(data) });
      write('session', session);
      location.hash = '#/';
    } catch (error) {
      showError(errorBox, error);
      button.disabled = false;
      button.textContent = signup ? 'Cadastre-se' : 'Entrar';
    }
  });
}

async function renderCatalog(query) {
  const params = new URLSearchParams(query);
  const page = Number(params.get('pagina')) || 1;
  view.innerHTML = `
    <div class="catalog">
      <details class="filters">
        <summary>Filtros</summary>
        <form class="filters-body" id="filters-form">
          <div><label for="busca">Buscar</label><input id="busca" name="busca" type="search" value="${escapeHtml(params.get('busca') ?? '')}" /></div>
          <div><label for="precoMin">Preço mínimo (R$)</label><input id="precoMin" name="precoMin" type="number" min="0" step="any" value="${escapeHtml(params.get('precoMin') ?? '')}" /></div>
          <div><label for="precoMax">Preço máximo (R$)</label><input id="precoMax" name="precoMax" type="number" min="0" step="any" value="${escapeHtml(params.get('precoMax') ?? '')}" /></div>
          <button class="primary" type="submit">Aplicar filtros</button>
          <a class="button" href="#/">Limpar</a>
        </form>
      </details>
      <section aria-live="polite"><h1>Produtos</h1><div id="catalog-result"><p class="hint">Carregando… (o servidor pode levar até 1 minuto na primeira vez)</p></div></section>
    </div>`;
  document.querySelector('.filters').open = matchMedia('(min-width: 1025px)').matches;
  document.getElementById('filters-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const filled = [...new FormData(event.target)].filter(([, value]) => value !== '');
    location.hash = '#/?' + new URLSearchParams(filled);
  });

  const result = document.getElementById('catalog-result');
  try {
    params.set('pagina', page);
    params.set('limite', PAGE_SIZE);
    const { dados, paginacao } = await api('/produtos?' + params);
    if (dados.length === 0) {
      result.innerHTML = '<p>Nenhum produto encontrado.</p>';
      return;
    }
    const pages = Math.ceil(paginacao.total / paginacao.limite);
    const link = (target) => {
      const next = new URLSearchParams(query);
      next.set('pagina', target);
      return '#/?' + next;
    };
    result.innerHTML = `
      <ul class="grid">${dados.map((product) => `
        <li><a class="card" href="#/produto/${product.id}">
          <div class="thumb">${SHIRT}</div>
          <div class="card-info"><strong>${escapeHtml(product.nome)}</strong><span class="price">${money(product.preco)}</span>
          ${product.quantidadeEstoque === 0 ? '<div class="soldout">Esgotado</div>' : ''}</div>
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
      <article class="product">
        <div class="thumb" role="img" aria-label="Imagem de ${escapeHtml(product.nome)}">${SHIRT}</div>
        <form id="product-form">
          <h1>${escapeHtml(product.nome)}</h1>
          <p class="price">${money(product.preco)}</p>
          <p>${escapeHtml(product.descricao ?? '')}</p>
          <p class="${available === 0 ? 'error' : 'hint'}">${available === 0 ? 'Sem estoque disponível.' : `${available} em estoque`}</p>
          <fieldset class="field" style="border:0;padding:0;margin:0 0 14px"><legend>Cor</legend><div class="options">${options('cor', COLORS)}</div></fieldset>
          <fieldset class="field" style="border:0;padding:0;margin:0 0 14px"><legend>Tamanho</legend><div class="options">${options('tamanho', SIZES)}</div></fieldset>
          <div class="field"><label>Quantidade</label>
            <div class="stepper">
              <button type="button" id="minus" aria-label="Diminuir quantidade">−</button>
              <output id="qty" aria-live="polite">1</output>
              <button type="button" id="plus" aria-label="Aumentar quantidade">+</button>
            </div></div>
          <div id="product-error"></div>
          <button class="primary" type="submit" ${available === 0 ? 'disabled' : ''}>Adicionar ao carrinho</button>
        </form>
      </article>`;
    let quantity = 1;
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
    if (available === 0) quantity = 0;
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
    view.innerHTML = '<h1>Carrinho</h1><p>Seu carrinho está vazio.</p><a class="button primary" href="#/">Ver produtos</a>';
    return;
  }
  const stockOf = (produtoId) => cart.filter((line) => line.produtoId === produtoId).reduce((sum, line) => sum + line.quantidade, 0);
  view.innerHTML = `
    <h1>Carrinho</h1>
    <div>${cart.map((line, index) => `
      <div class="cart-line">
        <div class="thumb">${SHIRT}</div>
        <div><strong>${escapeHtml(line.nome)}</strong><br /><span class="hint">${line.cor} · ${line.tamanho}</span><br /><span class="price">${money(line.preco)}</span></div>
        <div class="row">
          <div class="stepper">
            <button type="button" data-action="minus" data-index="${index}" aria-label="Diminuir quantidade de ${escapeHtml(line.nome)}" ${line.quantidade <= 1 ? 'disabled' : ''}>−</button>
            <output>${line.quantidade}</output>
            <button type="button" data-action="plus" data-index="${index}" aria-label="Aumentar quantidade de ${escapeHtml(line.nome)}" ${stockOf(line.produtoId) >= line.estoque ? 'disabled' : ''}>+</button>
          </div>
          <button type="button" data-action="remove" data-index="${index}" aria-label="Remover produto do carrinho">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
          </button>
        </div>
      </div>`).join('')}</div>
    <div class="summary-row total"><span>Subtotal</span><span>${money(cartTotals().subtotal)}</span></div>
    <p><a class="button primary" href="#/checkout">Continuar para o pagamento</a></p>`;
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
    <h1>Finalizar compra</h1>
    <div class="checkout">
      <div>
        <section class="block" aria-labelledby="h-frete"><h2 id="h-frete">1. Frete</h2>
          <form class="inline-form" id="frete-form" novalidate>
            <input id="cep" inputmode="numeric" maxlength="9" placeholder="CEP (ex.: 01310-100)" aria-label="CEP" autocomplete="postal-code" />
            <button type="submit">Calcular</button>
          </form><div id="frete-msg" aria-live="polite"></div></section>
        <section class="block" aria-labelledby="h-cupom"><h2 id="h-cupom">2. Cupom de desconto</h2>
          <form class="inline-form" id="cupom-form">
            <input id="cupom" placeholder="Código do cupom" aria-label="Código do cupom" />
            <button type="submit">Aplicar</button>
          </form><div id="cupom-msg" aria-live="polite"></div></section>
        <section class="block" aria-labelledby="h-pag"><h2 id="h-pag">3. Pagamento</h2>
          <div class="pay-options" role="radiogroup" aria-label="Método de pagamento">${PAYMENTS.map((payment) => `
            <label><input type="radio" name="pagamento" value="${payment.id}" /><span>
              <svg viewBox="0 0 24 24" aria-hidden="true">${payment.icon}</svg>${payment.label}</span></label>`).join('')}</div></section>
      </div>
      <section class="block" aria-labelledby="h-resumo"><h2 id="h-resumo">Resumo</h2>
        <div id="summary"></div><div id="checkout-error"></div>
        <button class="primary" id="finish" type="button" style="width:100%">Finalizar compra</button></section>
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

async function renderOrder(id, query) {
  view.innerHTML = '<p class="hint">Carregando…</p>';
  try {
    const order = await api(`/pedidos/${encodeURIComponent(id)}`);
    const isNew = new URLSearchParams(query).get('novo');
    view.innerHTML = `
      <h1>${isNew ? 'Pedido registrado!' : `Pedido #${order.id}`}</h1>
      <div class="block">
        <p>Pedido <strong>#${order.id}</strong> · <span class="status">${order.status.replace('_', ' ')}</span></p>
        <div class="summary-row"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
        <div class="summary-row"><span>Desconto${order.cupom ? ` (${escapeHtml(order.cupom)})` : ''}</span><span>− ${money(order.desconto)}</span></div>
        <div class="summary-row"><span>Frete</span><span>${money(order.frete)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${money(order.valorTotal)}</span></div>
      </div>
      <a class="button primary" href="#/">Continuar comprando</a> <a class="button" href="#/pedidos">Meus pedidos</a>`;
  } catch (error) {
    showError(view, error);
  }
}

async function renderOrders() {
  view.innerHTML = '<h1>Meus pedidos</h1><div id="orders"><p class="hint">Carregando…</p></div>';
  const box = document.getElementById('orders');
  try {
    const orders = await api(`/pedidos?clienteId=${session.cliente.id}`);
    box.innerHTML = orders.length === 0 ? '<p>Você ainda não fez pedidos.</p>' : orders.map((order) => `
      <a class="order-row" href="#/pedido/${order.id}"><span>Pedido #${order.id}</span><span class="status">${order.status.replace('_', ' ')}</span><strong>${money(order.valorTotal)}</strong></a>`).join('');
  } catch (error) {
    showError(box, error);
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
  document.getElementById('topbar').hidden = !session;
  document.getElementById('menu-panel').hidden = true;
  view.onclick = null;
  if (session) document.getElementById('menu-user').textContent = session.cliente.nome;
  const [, section, id] = path.split('/');
  if (path === '/login') return renderAuth('login');
  if (path === '/cadastro') return renderAuth('cadastro');
  if (section === 'produto') return renderProduct(id);
  if (section === 'carrinho') return renderCart();
  if (section === 'checkout') return renderCheckout();
  if (section === 'pedido') return renderOrder(id, query);
  if (section === 'pedidos') return renderOrders();
  renderCatalog(query);
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
