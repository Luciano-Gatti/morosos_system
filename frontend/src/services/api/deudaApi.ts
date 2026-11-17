import { normalizePageResponse, normalizeSpringPage } from "@/adapters/pagination";
import { apiClient, buildQueryParams, type QueryValue } from "@/lib/apiClient";
import type { FrontendPage, PageResponse, SpringPage } from "@/types/pagination";

export type CargaDeudaDto = Record<string, unknown>;
export type DetalleCargaDeudaDto = Record<string, unknown>;
export type ErrorCargaDeudaDto = Record<string, unknown>;
type DeudaQueryParams = Record<string, QueryValue>;

type PageApi<T> = PageResponse<T> | SpringPage<T>;

const normalizePage = <T>(data: PageApi<T>): FrontendPage<T> =>
  "number" in data ? normalizeSpringPage(data) : normalizePageResponse(data);

export const deudaApi = {
  async getCargas(
    params: DeudaQueryParams,
  ): Promise<FrontendPage<CargaDeudaDto>> {
    const data = await apiClient.get<PageApi<CargaDeudaDto>>(
      `/api/v1/deuda/cargas${buildQueryParams(params)}`,
    );
    return normalizePage(data);
  },
  importarCarga: (payload: FormData) =>
    apiClient.post<CargaDeudaDto>("/api/v1/deuda/cargas", payload),
  getCarga: (id: string) =>
    apiClient.get<CargaDeudaDto>(`/api/v1/deuda/cargas/${id}`),
  async getDetalles(
    id: string,
    params: DeudaQueryParams,
  ): Promise<FrontendPage<DetalleCargaDeudaDto>> {
    const data = await apiClient.get<PageApi<DetalleCargaDeudaDto>>(
      `/api/v1/deuda/cargas/${id}/detalles${buildQueryParams(params)}`,
    );
    return normalizePage(data);
  },
  async getErrores(
    id: string,
    params: DeudaQueryParams,
  ): Promise<FrontendPage<ErrorCargaDeudaDto>> {
    const data = await apiClient.get<PageApi<ErrorCargaDeudaDto>>(
      `/api/v1/deuda/cargas/${id}/errores${buildQueryParams(params)}`,
    );
    return normalizePage(data);
  },
};
