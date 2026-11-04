import { STATUS_LABELS } from './constants';
import { formatDate } from './format';

const HEADER = ['Pedido', 'Cliente', 'Data', 'Subtotal', 'Frete', 'Desconto', 'Total', 'Situação'];

const asNumber = (value) => value.toFixed(2).replace('.', ',');
const asText = (value) => `"${String(value).replaceAll('"', '""')}"`;

async function fetchAllSales(api, range) {
  const sales = [];
  for (let page = 1; ; page += 1) {
    const search = new URLSearchParams(range);
    search.set('pagina', page);
    search.set('limite', 100);
    const { dados, paginacao } = await api(`/relatorios/vendas?${search}`);
    sales.push(...dados);
    if (sales.length >= paginacao.total || dados.length === 0) {
      return sales;
    }
  }
}

function buildCsv(sales) {
  const lines = sales.map((sale) =>
    [
      sale.id,
      asText(sale.clienteNome),
      formatDate(sale.criadoEm),
      asNumber(sale.subtotal),
      asNumber(sale.frete),
      asNumber(sale.desconto),
      asNumber(sale.valorTotal),
      STATUS_LABELS[sale.status],
    ].join(';'),
  );
  return ['﻿' + HEADER.join(';'), ...lines].join('\r\n');
}

function download(content, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportSalesCsv(api, range) {
  const sales = await fetchAllSales(api, range);
  download(buildCsv(sales), 'vendas.csv');
  return sales.length;
}
