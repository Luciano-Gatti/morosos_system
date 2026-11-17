import type { PageResponse, SpringPage } from "@/types/pagination";
import { apiClient, buildQueryParams, type QueryValue } from "@/lib/apiClient";
export interface CompromisoVigenteDto { id: string; fechaDesde: string; fechaHasta: string; montoComprometido?: number; observacion?: string; estado?: string }
export interface SeguimientoResultado {
  aplicados?: number; applied?: number; omitidos?: number; skipped?: number; errores?: number; errors?: number;
  resultados?: Array<{ estado?: string; mensaje?: string }>;
}
export const seguimientoApi = {
  getBandeja: (params: Record<string, QueryValue>) => apiClient.get<PageResponse<unknown> | SpringPage<unknown>>(`/api/v1/seguimiento/bandeja${buildQueryParams(params)}`),
  historialInmueble: (inmuebleId: string) => apiClient.get(`/api/v1/seguimiento/inmuebles/${inmuebleId}/historial`),
  iniciar: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/iniciar", body),
  avanzar: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/avanzar", body),
  enviarEtapa: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/enviar-etapa", body),
  repetir: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/repetir", body),
  pausar: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/pausar", body),
  reanudar: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/reanudar", body),
  cerrar: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/cerrar", body),
  cerrarBulk: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/cerrar/bulk", body),
  registrarCompromiso: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/compromisos", body),
  registrarCompromisosBulk: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/compromisos/bulk", body),
  getCompromisoVigente: (casoId: string) => apiClient.get<CompromisoVigenteDto>(`/api/v1/seguimiento/casos/${casoId}/compromiso-vigente`),
  actualizarCompromiso: (compromisoId: string, body: unknown) => apiClient.put<SeguimientoResultado>(`/api/v1/seguimiento/compromisos/${compromisoId}`, body),
  agregarObservacionEtapa: (body: unknown) => apiClient.post<SeguimientoResultado>("/api/v1/seguimiento/observaciones-etapa", body),
};
