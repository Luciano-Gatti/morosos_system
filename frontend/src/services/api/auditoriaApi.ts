import { normalizePageResponse, normalizeSpringPage } from "@/adapters/pagination";
import { apiClient, buildQueryParams, type QueryValue } from "@/lib/apiClient";
import type { PageResponse, SpringPage } from "@/types/pagination";

export const auditoriaApi = {
  list: (params?: Record<string, QueryValue>) => apiClient.get(`/api/v1/auditoria${buildQueryParams(params)}`),
  async movimientos(params?: Record<string, QueryValue>) {
    const data = await apiClient.get<PageResponse<Record<string, unknown>> | SpringPage<Record<string, unknown>>>(`/api/v1/auditoria/movimientos${buildQueryParams(params)}`);
    return "number" in data ? normalizeSpringPage(data) : normalizePageResponse(data);
  },
};
