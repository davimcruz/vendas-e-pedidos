export function withParams(params, changes) {
  const next = new URLSearchParams(params);
  next.delete('pagina');
  Object.entries(changes).forEach(([key, value]) => {
    if (value === null || value === '') {
      next.delete(key);
      return;
    }
    next.set(key, value);
  });
  return next;
}

export function withPage(params, page) {
  const next = new URLSearchParams(params);
  next.set('pagina', page);
  return next;
}
