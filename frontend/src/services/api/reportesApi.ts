import { apiClient, buildQueryParams, type QueryValue } from "@/lib/apiClient";

type ReporteParams = Record<string, QueryValue>;

export const reportesApi = {
  distritos: (reporteId: string) => apiClient.get<{ id: string; nombre: string }[]>(`/api/v1/reportes/${reporteId}/distritos`),
  morososGrupoDistrito: (params?: ReporteParams) =>
    apiClient.get<unknown>(`/api/v1/reportes/morosos-grupo-distrito${buildQueryParams(params)}`),
  accionesFechas: (params?: ReporteParams) =>
    apiClient.get<unknown>(`/api/v1/reportes/acciones-fechas${buildQueryParams(params)}`),
  accionesRegularizacion: (params?: ReporteParams) =>
    apiClient.get<unknown>(`/api/v1/reportes/acciones-regularizacion${buildQueryParams(params)}`),
  estadoInmuebles: (params?: ReporteParams) =>
    apiClient.get<unknown>(`/api/v1/reportes/estado-inmuebles${buildQueryParams(params)}`),
  historialMovimientos: (params?: ReporteParams) =>
    apiClient.get<unknown>(`/api/v1/reportes/historial-movimientos${buildQueryParams(params)}`),
};
