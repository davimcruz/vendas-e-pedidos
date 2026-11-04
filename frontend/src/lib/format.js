export function money(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('pt-BR');
}

export function formatDateUtc(value) {
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function pluralize(count, singular, plural) {
  if (count === 1) {
    return `${count} ${singular}`;
  }
  return `${count} ${plural}`;
}
