import { reportRepository } from './report.repository.js';
import type { DateRange, SalesFilters, SalesSummary } from './report.types.js';

export async function list(filters: SalesFilters) {
  const { rows, total } = await reportRepository.list(filters);
  return { dados: rows, paginacao: { pagina: filters.pagina, limite: filters.limite, total } };
}

export function summary(range: DateRange): Promise<SalesSummary> {
  return reportRepository.summary(range);
}
