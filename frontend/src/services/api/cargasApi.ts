import { normalizeSpringPage } from "@/adapters/pagination";
import { apiClient, buildQueryParams } from "@/lib/apiClient";
import type {
  CargaIncidencia,
  CargaIncidenciaFilters,
  CargaProceso,
  CargaTipo,
} from "@/types/cargas";
import type { FrontendPage, SpringPage } from "@/types/pagination";

function listarErroresCarga(id: string, params: Record<string, string | number | undefined>): Promise<FrontendPage<CargaIncidencia>> {
  return apiClient.get<SpringPage<CargaIncidencia>>(`/api/v1/cargas/${id}/errores${buildQueryParams(params)}`)
    .then(normalizeSpringPage);
}

export interface PeriodoPorRevisar { fila: number; cuenta: string; numero: string; periodo: string; estado: string; importe: string }

export const cargasApi = {
  revisarPeriodos(file: File) {
    const datos = new FormData();
    datos.append("file", file);
    return apiClient.post<PeriodoPorRevisar[]>("/api/v1/cargas/facturacion-pagos/revisar-periodos", datos);
  },
  async listar(params: Record<string, string | number | undefined>): Promise<FrontendPage<CargaProceso>> {
    return normalizeSpringPage(
      await apiClient.get<SpringPage<CargaProceso>>(`/api/v1/cargas${buildQueryParams(params)}`),
    );
  },
  obtener: (id: string) => apiClient.get<CargaProceso>(`/api/v1/cargas/${id}`),
  errores: listarErroresCarga,
  incidencias(id: string, params: Record<string, string | number | undefined>): Promise<FrontendPage<CargaIncidencia>> {
    return listarErroresCarga(id, params);
  },
  async todasLasIncidencias(id: string, filters: CargaIncidenciaFilters): Promise<CargaIncidencia[]> {
    const size = 500;
    const first = await listarErroresCarga(id, { ...filters, page: 0, size });
    const rows = [...first.content];
    for (let page = 1; page < first.totalPages; page += 1) {
      const next = await listarErroresCarga(id, { ...filters, page, size });
      rows.push(...next.content);
    }
    return rows;
  },
  importar(tipo: CargaTipo, file: File, periodo?: string, filasCaudalimetro: number[] = []) {
    const endpoints: Partial<Record<CargaTipo, string>> = {
      INMUEBLES: "/api/v1/cargas/inmuebles/excel",
      DEUDA: "/api/v1/cargas/deuda/excel",
      FACTURACION_PAGOS: "/api/v1/cargas/facturacion-pagos/excel",
    };
    const endpoint = endpoints[tipo];
    if (!endpoint) throw new Error(`La carga ${tipo} todavía no admite archivo manual.`);
    const body = new FormData();
    body.append("file", file);
    if (tipo === "FACTURACION_PAGOS" && filasCaudalimetro.length) body.append("filasCaudalimetro", filasCaudalimetro.join(","));
    if (tipo === "DEUDA" && periodo) body.append("periodo", `${periodo}-01`);
    return apiClient.post<CargaProceso>(endpoint, body);
  },
};
