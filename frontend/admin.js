// Painel de administração. Carregado antes de app.js e usa as funções dele (api, openDialog, toast...)
// só depois que a página termina de carregar.
const ADMIN_PAGE_SIZE = 15;
const ADMIN_SECTIONS = [
  { id: 'produtos', label: 'Produtos', icon: '<path d="M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10"/>' },
  { id: 'pedidos', label: 'Pedidos', icon: '<path d="M6 4h12v16l-3-2-3 2-3-2-3 2zM9 9h6M9 13h6"/>' },
  { id: 'cupons', label: 'Cupons', icon: '<path d="M4 8a2 2 0 002-2h12a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H6a2 2 0 00-2-2v-2a2 2 0 000-4zM10 9l4 6"/>' },
  { id: 'relatorios', label: 'Relatórios', icon: '<path d="M5 20V10M12 20V4M19 20v-7"/>' },
];

const adminContent = () => document.getElementById('admin-content');
const adminLink = (section, query, changes) => {
  const next = new URLSearchParams(query);
  next.delete('pagina');
  Object.entries(changes).forEach(([key, value]) => (value === null || value === '' ? next.delete(key) : next.set(key, value)));
  return `#/admin/${section}?${next}`;
};

const adminPageLink = (section, query, page) => {
  const next = new URLSearchParams(query);
  next.set('pagina', page);
  return `#/admin/${section}?${next}`;
};

function adminShell(active, title, actionsHtml = '') {
  view.innerHTML = `
    <div class="admin">
      <nav class="admin-nav" aria-label="Administração">
        ${ADMIN_SECTIONS.map((section) => `
          <a href="#/admin/${section.id}" ${section.id === active ? 'aria-current="page"' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true">${section.icon}</svg>${section.label}</a>`).join('')}
        <a class="leave" href="#/">← Voltar à loja</a>
      </nav>
      <section>
        <div class="admin-head"><h1>${title}</h1><div class="actions">${actionsHtml}</div></div>
        <div id="admin-content"><p class="hint">Carregando…</p></div>
      </section>
    </div>`;
}

/** A última coluna é a de ações: ganha a classe que o CSS usa para empilhar no celular. */
function adminTable(headers, rows) {
  return `<div class="table-wrap"><table class="table">
    <thead><tr>${headers.map((header) => `<th${header === 'Ações' ? ' class="cell-actions"' : ''}>${header}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((cells) => `<tr>${cells.map((cell, index) =>
      `<td data-label="${headers[index]}"${index === headers.length - 1 && headers[index] === 'Ações' ? ' class="cell-actions"' : ''}>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function adminPager(page, total, limit, linkFor) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return '';
  return `<nav class="pager" aria-label="Paginação">
    ${page > 1 ? `<a class="button" href="${linkFor(page - 1)}">Anterior</a>` : ''}
    <span>Página ${page} de ${pages}</span>
    ${page < pages ? `<a class="button" href="${linkFor(page + 1)}">Próxima</a>` : ''}</nav>`;
}

const pill = (label, kind) => `<span class="status status-${kind}">${label}</span>`;
const emptyRow = (text) => `<div class="empty"><p>${text}</p></div>`;

function renderAdmin(section = 'produtos', query = '') {
  if (section === 'pedidos') return renderAdminOrders(query);
  if (section === 'cupons') return renderAdminCoupons();
  if (section === 'relatorios') return renderAdminReports(query);
  return renderAdminProducts(query);
}

// ---------- produtos e estoque ----------

async function renderAdminProducts(query) {
  const params = new URLSearchParams(query);
  const page = Number(params.get('pagina')) || 1;
  const showInactive = params.get('inativos') === '1';
  adminShell('produtos', 'Produtos', '<button type="button" class="primary" id="new-product">Novo produto</button>');
  adminContent().innerHTML = `
    <div class="toolbar">
      <form id="product-search" role="search">
        <input type="search" name="busca" aria-label="Buscar produtos" placeholder="Buscar por nome ou descrição" value="${escapeHtml(params.get('busca') ?? '')}" />
        <button type="submit">Buscar</button>
      </form>
      <label class="check"><input type="checkbox" id="show-inactive" ${showInactive ? 'checked' : ''} />Mostrar inativos</label>
    </div>
    <div id="admin-table"><p class="hint">Carregando…</p></div>`;

  document.getElementById('product-search').onsubmit = (event) => {
    event.preventDefault();
    location.hash = adminLink('produtos', query, { busca: new FormData(event.target).get('busca').trim() });
  };
  document.getElementById('show-inactive').onchange = (event) => {
    location.hash = adminLink('produtos', query, { inativos: event.target.checked ? '1' : null });
  };

  const table = document.getElementById('admin-table');
  const reload = () => renderAdminProducts(query);
  try {
    const search = new URLSearchParams({ pagina: page, limite: ADMIN_PAGE_SIZE, incluirInativos: showInactive });
    if (params.get('busca')) search.set('busca', params.get('busca'));
    const { dados, paginacao } = await api('/produtos?' + search);
    const products = new Map(dados.map((product) => [String(product.id), product]));
    table.innerHTML = dados.length === 0
      ? emptyRow('Nenhum produto encontrado.')
      : adminTable(['Produto', 'Preço', 'Estoque', 'Situação', 'Ações'], dados.map((product) => [
        `<strong>${escapeHtml(product.nome)}</strong><br /><span class="hint">${escapeHtml(product.descricao ?? '')}</span>`,
        money(product.preco),
        product.quantidadeEstoque === 0 ? '<span class="tag">Sem estoque</span>' : product.quantidadeEstoque,
        product.ativo ? pill('Ativo', 'pago') : pill('Inativo', 'cancelado'),
        `<div class="actions">
          <button type="button" data-action="edit" data-id="${product.id}">Editar</button>
          <button type="button" data-action="stock" data-id="${product.id}">Estoque</button>
          <button type="button" data-action="${product.ativo ? 'deactivate' : 'activate'}" data-id="${product.id}">${product.ativo ? 'Desativar' : 'Ativar'}</button>
        </div>`,
      ])) + adminPager(page, paginacao.total, paginacao.limite, (target) => adminPageLink('produtos', query, target));

    table.onclick = async (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const product = products.get(button.dataset.id);
      try {
        if (button.dataset.action === 'edit') openProductDialog(product, reload);
        if (button.dataset.action === 'stock') openStockDialog(product, reload);
        if (button.dataset.action === 'deactivate' && (await confirmAction(`Desativar ${escapeHtml(product.nome)}?`, 'O produto some da loja, mas continua nos pedidos antigos. Você pode ativá-lo de novo depois.', 'Desativar'))) {
          await api(`/produtos/${product.id}`, { method: 'DELETE' });
          toast(`${product.nome} desativado.`);
          reload();
        }
        if (button.dataset.action === 'activate') {
          await api(`/produtos/${product.id}`, { method: 'PUT', body: JSON.stringify({ ativo: true }) });
          toast(`${product.nome} ativado.`);
          reload();
        }
      } catch (error) {
        toast(error.message);
      }
    };
  } catch (error) {
    showError(table, error);
  }
  document.getElementById('new-product').onclick = () => openProductDialog(null, reload);
}

function openProductDialog(product, afterSave) {
  const editing = product !== null;
  openDialog(editing ? 'Editar produto' : 'Novo produto', `
    <div class="field"><label for="nome">Nome</label><input id="nome" name="nome" required minlength="2" maxlength="160" value="${escapeHtml(product?.nome ?? '')}" /></div>
    <div class="field"><label for="descricao">Descrição</label><textarea id="descricao" name="descricao">${escapeHtml(product?.descricao ?? '')}</textarea></div>
    <div class="field-row">
      <div class="field"><label for="preco">Preço (R$)</label><input id="preco" name="preco" type="number" min="0" step="0.01" required value="${product?.preco ?? ''}" /></div>
      ${editing ? '' : '<div class="field"><label for="quantidadeEstoque">Estoque inicial</label><input id="quantidadeEstoque" name="quantidadeEstoque" type="number" min="0" step="1" required value="0" /></div>'}
    </div>`, async (data) => {
    const body = { nome: data.nome, descricao: data.descricao.trim() || null, preco: Number(data.preco) };
    if (editing) {
      await api(`/produtos/${product.id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      body.quantidadeEstoque = Number(data.quantidadeEstoque);
      await api('/produtos', { method: 'POST', body: JSON.stringify(body) });
    }
    toast(editing ? 'Produto salvo.' : 'Produto criado.');
    afterSave();
  }, editing ? 'Salvar' : 'Criar produto');
}

function openStockDialog(product, afterSave) {
  openDialog('Estoque', `
    <p>Estoque atual de <strong>${escapeHtml(product.nome)}</strong>: ${product.quantidadeEstoque}</p>
    <fieldset><legend>Operação</legend>
      <div class="radio-row">
        <label class="check"><input type="radio" name="modo" value="definir" checked />Definir quantidade</label>
        <label class="check"><input type="radio" name="modo" value="ajustar" />Ajustar (+ ou −)</label>
      </div></fieldset>
    <div class="field"><label for="valor">Valor</label><input id="valor" name="valor" type="number" step="1" required /></div>`, async (data) => {
    const value = Number(data.valor);
    if (!Number.isInteger(value)) throw new Error('Informe um número inteiro.');
    if (data.modo === 'definir') {
      await api(`/estoque/${product.id}`, { method: 'PUT', body: JSON.stringify({ quantidade: value }) });
    } else {
      await api(`/estoque/${product.id}`, { method: 'PATCH', body: JSON.stringify({ ajuste: value }) });
    }
    toast('Estoque atualizado.');
    afterSave();
  });
}

// ---------- pedidos ----------

async function renderAdminOrders(query) {
  const status = new URLSearchParams(query).get('status');
  adminShell('pedidos', 'Pedidos');
  const filters = [{ id: null, label: 'Todos' }, ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label }))];
  adminContent().innerHTML = `
    <nav class="chips" aria-label="Filtrar por situação">${filters.map((filter) =>
      `<a class="chip" href="${adminLink('pedidos', query, { status: filter.id })}" ${filter.id === status ? 'aria-current="true"' : ''}>${filter.label}</a>`).join('')}</nav>
    <div id="admin-table"><p class="hint">Carregando…</p></div>`;
  const table = document.getElementById('admin-table');
  try {
    const orders = await api('/pedidos' + (status ? `?status=${status}` : ''));
    table.innerHTML = orders.length === 0
      ? emptyRow('Nenhum pedido nesta situação.')
      : adminTable(['Pedido', 'Cliente', 'Total', 'Situação', 'Ações'], orders.map((order) => [
        `<a href="#/pedido/${order.id}"><strong>#${order.id}</strong></a>`,
        `Cliente #${order.clienteId}`,
        money(order.valorTotal),
        statusBadge(order.status),
        `<div class="actions">
          <a class="button" href="#/pedido/${order.id}">Ver</a>
          ${NEXT_STATUS[order.status].map((next) => `<button type="button" data-id="${order.id}" data-status="${next.status}">${next.label}</button>`).join('')}
        </div>`,
      ]));
    table.onclick = async (event) => {
      const button = event.target.closest('[data-status]');
      if (!button) return;
      try {
        if (await changeOrderStatus(button.dataset.id, button.dataset.status)) renderAdminOrders(query);
      } catch (error) {
        toast(error.message);
      }
    };
  } catch (error) {
    showError(table, error);
  }
}

// ---------- cupons ----------

async function renderAdminCoupons() {
  adminShell('cupons', 'Cupons', '<button type="button" class="primary" id="new-coupon">Novo cupom</button>');
  const content = adminContent();
  const reload = () => renderAdminCoupons();
  try {
    const coupons = await api('/cupons');
    const byCode = new Map(coupons.map((coupon) => [coupon.codigo, coupon]));
    const validity = (coupon) => {
      if (!coupon.expiraEm) return 'Sem validade';
      const date = new Date(coupon.expiraEm).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      return new Date(coupon.expiraEm) < new Date() ? `${date} <span class="tag">Expirado</span>` : date;
    };
    content.innerHTML = coupons.length === 0
      ? emptyRow('Nenhum cupom cadastrado. Crie o primeiro no botão acima.')
      : adminTable(['Código', 'Desconto', 'Validade', 'Situação', 'Ações'], coupons.map((coupon) => [
        `<strong>${escapeHtml(coupon.codigo)}</strong>`,
        coupon.tipo === 'percentual' ? `${coupon.desconto}%` : money(coupon.desconto),
        validity(coupon),
        coupon.status === 'ativo' ? pill('Ativo', 'pago') : pill('Inativo', 'cancelado'),
        `<div class="actions">
          <button type="button" data-action="edit" data-code="${escapeHtml(coupon.codigo)}">Editar</button>
          <button type="button" data-action="toggle" data-code="${escapeHtml(coupon.codigo)}">${coupon.status === 'ativo' ? 'Desativar' : 'Ativar'}</button>
        </div>`,
      ]));
    content.onclick = async (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const coupon = byCode.get(button.dataset.code);
      if (button.dataset.action === 'edit') openCouponDialog(coupon, reload);
      if (button.dataset.action === 'toggle') {
        try {
          await api(`/cupons/${encodeURIComponent(coupon.codigo)}`, { method: 'PUT', body: JSON.stringify({ status: coupon.status === 'ativo' ? 'inativo' : 'ativo' }) });
          toast(`Cupom ${coupon.codigo} atualizado.`);
          reload();
        } catch (error) {
          toast(error.message);
        }
      }
    };
  } catch (error) {
    showError(content, error);
  }
  document.getElementById('new-coupon').onclick = () => openCouponDialog(null, reload);
}

function openCouponDialog(coupon, afterSave) {
  const editing = coupon !== null;
  const option = (value, label, current) => `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`;
  openDialog(editing ? `Editar cupom ${escapeHtml(coupon.codigo)}` : 'Novo cupom', `
    ${editing ? '' : '<div class="field"><label for="codigo">Código</label><input id="codigo" name="codigo" required maxlength="20" placeholder="Ex.: BEMVINDO10" /></div>'}
    <div class="field-row">
      <div class="field"><label for="tipo">Tipo</label><select id="tipo" name="tipo">${option('percentual', 'Percentual (%)', coupon?.tipo)}${option('fixo', 'Valor fixo (R$)', coupon?.tipo)}</select></div>
      <div class="field"><label for="desconto">Desconto</label><input id="desconto" name="desconto" type="number" min="0" step="0.01" required value="${coupon?.desconto ?? ''}" /></div>
    </div>
    <div class="field-row">
      <div class="field"><label for="status">Situação</label><select id="status" name="status">${option('ativo', 'Ativo', coupon?.status)}${option('inativo', 'Inativo', coupon?.status)}</select></div>
      <div class="field"><label for="expiraEm">Validade (opcional)</label><input id="expiraEm" name="expiraEm" type="date" value="${coupon?.expiraEm?.slice(0, 10) ?? ''}" /></div>
    </div>`, async (data) => {
    const body = { tipo: data.tipo, desconto: Number(data.desconto), status: data.status, expiraEm: data.expiraEm || null };
    if (editing) {
      await api(`/cupons/${encodeURIComponent(coupon.codigo)}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await api('/cupons', { method: 'POST', body: JSON.stringify({ ...body, codigo: data.codigo }) });
    }
    toast(editing ? 'Cupom salvo.' : 'Cupom criado.');
    afterSave();
  }, editing ? 'Salvar' : 'Criar cupom');
}

// ---------- relatórios ----------

async function renderAdminReports(query) {
  const params = new URLSearchParams(query);
  const page = Number(params.get('pagina')) || 1;
  const range = new URLSearchParams();
  ['inicio', 'fim'].forEach((key) => params.get(key) && range.set(key, params.get(key)));
  adminShell('relatorios', 'Relatórios', '<button type="button" id="export-sales">Exportar CSV</button>');
  adminContent().innerHTML = `
    <form class="toolbar" id="range-form">
      <div><label for="inicio">De</label><input id="inicio" name="inicio" type="date" value="${escapeHtml(params.get('inicio') ?? '')}" /></div>
      <div><label for="fim">Até</label><input id="fim" name="fim" type="date" value="${escapeHtml(params.get('fim') ?? '')}" /></div>
      <button type="submit" class="primary">Aplicar período</button>
      <a class="button" href="#/admin/relatorios">Limpar</a>
    </form>
    <div id="admin-table"><p class="hint">Carregando…</p></div>`;
  document.getElementById('range-form').onsubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    location.hash = adminLink('relatorios', query, { inicio: data.get('inicio'), fim: data.get('fim') });
  };

  const table = document.getElementById('admin-table');
  try {
    const listSearch = new URLSearchParams(range);
    listSearch.set('pagina', page);
    listSearch.set('limite', ADMIN_PAGE_SIZE);
    const [summary, sales] = await Promise.all([
      api('/relatorios/vendas/resumo?' + range),
      api('/relatorios/vendas?' + listSearch),
    ]);
    const date = (value) => new Date(value).toLocaleDateString('pt-BR');
    table.innerHTML = `
      <div class="cards">
        <div class="stat"><span>Pedidos vendidos</span><strong>${summary.quantidadePedidos}</strong></div>
        <div class="stat"><span>Valor vendido</span><strong>${money(summary.valorVendido)}</strong></div>
        <div class="stat"><span>Ticket médio</span><strong>${money(summary.ticketMedio)}</strong></div>
      </div>
      <p class="hint">Considera pedidos pagos e enviados no período.</p>
      ${sales.dados.length === 0 ? emptyRow('Nenhuma venda no período.') : adminTable(
        ['Pedido', 'Cliente', 'Data', 'Subtotal', 'Frete', 'Desconto', 'Total', 'Situação'],
        sales.dados.map((sale) => [
          `<a href="#/pedido/${sale.id}"><strong>#${sale.id}</strong></a>`, escapeHtml(sale.clienteNome), date(sale.criadoEm),
          money(sale.subtotal), money(sale.frete), money(sale.desconto), `<strong>${money(sale.valorTotal)}</strong>`, statusBadge(sale.status),
        ]))}
      ${adminPager(page, sales.paginacao.total, sales.paginacao.limite, (target) => adminPageLink('relatorios', query, target))}`;
  } catch (error) {
    showError(table, error);
  }
  document.getElementById('export-sales').onclick = () => exportSalesCsv(range).catch((error) => toast(error.message));
}

/** Baixa todas as páginas do período e salva um CSV que o Excel abre direto (separador ;, decimal com vírgula). */
async function exportSalesCsv(range) {
  const rows = [];
  for (let page = 1; ; page += 1) {
    const search = new URLSearchParams(range);
    search.set('pagina', page);
    search.set('limite', 100);
    const { dados, paginacao } = await api('/relatorios/vendas?' + search);
    rows.push(...dados);
    if (rows.length >= paginacao.total || dados.length === 0) break;
  }
  const number = (value) => value.toFixed(2).replace('.', ',');
  const text = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const lines = [['Pedido', 'Cliente', 'Data', 'Subtotal', 'Frete', 'Desconto', 'Total', 'Situação'].join(';')];
  rows.forEach((sale) => lines.push([
    sale.id, text(sale.clienteNome), new Date(sale.criadoEm).toLocaleDateString('pt-BR'),
    number(sale.subtotal), number(sale.frete), number(sale.desconto), number(sale.valorTotal), STATUS_LABELS[sale.status],
  ].join(';')));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  link.download = 'vendas.csv';
  link.click();
  URL.revokeObjectURL(link.href);
  toast(`${rows.length} ${rows.length === 1 ? 'venda exportada' : 'vendas exportadas'}.`);
}
