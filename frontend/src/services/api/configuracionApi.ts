import {
  apiClient,
  buildQueryParams,
  type QueryValue,
} from "@/lib/apiClient";

export type ConfiguracionRecord = Record<string, unknown>;
export type ConfiguracionQueryParams = Record<string, QueryValue>;

export interface ConfiguracionPage<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
}

export type ConfiguracionCollection<T = ConfiguracionRecord> =
  | T[]
  | ConfiguracionPage<T>;

export function extractConfiguracionItems<T>(
  response: ConfiguracionCollection<T>,
): T[] {
  if (Array.isArray(response)) return response;
  return Array.isArray(response.content) ? response.content : [];
}

export interface CatalogoBaseBody {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface GrupoDistritoConfigBody {
  grupoId: string;
  distritoId: string;
  seguimientoHabilitado: boolean;
}

export interface EtapaBody extends CatalogoBaseBody {
  orden: number;
  esFinal: boolean;
}

export interface ReordenarEtapasBody {
  etapas: Array<{ id: string; orden: number }>;
}

export interface ParametroSeguimientoBody {
  valor: string | number | boolean;
}

export interface ImpactoParametroCambio {
  clave: string;
  valorAnterior: string | number | boolean;
  valorNuevo: string | number | boolean;
}

export interface ImpactoParametrosBody {
  parametros: ImpactoParametroCambio[];
}

export interface ImpactoSeguimientoResponse {
  hayImpacto: boolean;
  impactoCalculable: boolean;
  totalProcesosAbiertos: number;
  procesosAfectados: number;
  porcentajeImpacto: number;
  mensaje: string;
}

type CollectionResponse = ConfiguracionCollection<ConfiguracionRecord>;

const collectionGet = (path: string, params?: ConfiguracionQueryParams) =>
  apiClient.get<CollectionResponse>(`${path}${buildQueryParams(params)}`);

const deleteResource = (path: string) =>
  apiClient.delete<unknown>(path);

export const configuracionApi = {
  grupos: (params?: ConfiguracionQueryParams) =>
    collectionGet("/api/v1/grupos", params),
  crearGrupo: (body: CatalogoBaseBody) =>
    apiClient.post<ConfiguracionRecord>("/api/v1/grupos", body),
  actualizarGrupo: (id: string, body: CatalogoBaseBody) =>
    apiClient.put<ConfiguracionRecord>(`/api/v1/grupos/${id}`, body),
  toggleGrupoActivo: (id: string, activo: boolean) =>
    apiClient.patch<ConfiguracionRecord>(`/api/v1/grupos/${id}/activo`, { activo }),
  eliminarGrupo: (id: string) => deleteResource(`/api/v1/grupos/${id}`),

  distritos: (params?: ConfiguracionQueryParams) =>
    collectionGet("/api/v1/distritos", params),
  crearDistrito: (body: CatalogoBaseBody) =>
    apiClient.post<ConfiguracionRecord>("/api/v1/distritos", body),
  actualizarDistrito: (id: string, body: CatalogoBaseBody) =>
    apiClient.put<ConfiguracionRecord>(`/api/v1/distritos/${id}`, body),
  toggleDistritoActivo: (id: string, activo: boolean) =>
    apiClient.patch<ConfiguracionRecord>(`/api/v1/distritos/${id}/activo`, { activo }),

  parametrosSeguimiento: (params?: ConfiguracionQueryParams) =>
    collectionGet("/api/v1/parametros-seguimiento", params),
  actualizarParametroSeguimiento: (
    codigo: string,
    body: ParametroSeguimientoBody,
  ) =>
    apiClient.put<ConfiguracionRecord>(
      `/api/v1/parametros-seguimiento/${codigo}`,
      body,
    ),
  calcularImpactoParametrosSeguimiento: (body: ImpactoParametrosBody) =>
    apiClient.post<ImpactoSeguimientoResponse>(
      "/api/v1/parametros-seguimiento/impacto",
      body,
    ),

  grupoDistritoConfig: (params?: ConfiguracionQueryParams) =>
    collectionGet("/api/v1/grupo-distrito-config", params),
  crearGrupoDistritoConfig: (body: GrupoDistritoConfigBody) =>
    apiClient.post<ConfiguracionRecord>("/api/v1/grupo-distrito-config", body),
  actualizarGrupoDistritoConfig: (
    id: string,
    body: GrupoDistritoConfigBody,
  ) =>
    apiClient.put<ConfiguracionRecord>(
      `/api/v1/grupo-distrito-config/${id}`,
      body,
    ),
  eliminarGrupoDistritoConfig: (id: string) =>
    deleteResource(`/api/v1/grupo-distrito-config/${id}`),

  etapas: (params?: ConfiguracionQueryParams) =>
    collectionGet("/api/v1/etapas", params),
  crearEtapa: (body: EtapaBody) =>
    apiClient.post<ConfiguracionRecord>("/api/v1/etapas", body),
  actualizarEtapa: (id: string, body: EtapaBody) =>
    apiClient.put<ConfiguracionRecord>(`/api/v1/etapas/${id}`, body),
  eliminarEtapa: (id: string) => deleteResource(`/api/v1/etapas/${id}`),
  reordenarEtapas: (body: ReordenarEtapasBody) =>
    apiClient.post<ConfiguracionRecord>("/api/v1/etapas/reordenar", body),

  motivosCierre: (params?: ConfiguracionQueryParams) =>
    collectionGet("/api/v1/motivos-cierre", params),
  crearMotivoCierre: (body: CatalogoBaseBody) =>
    apiClient.post<ConfiguracionRecord>("/api/v1/motivos-cierre", body),
  actualizarMotivoCierre: (id: string, body: CatalogoBaseBody) =>
    apiClient.put<ConfiguracionRecord>(`/api/v1/motivos-cierre/${id}`, body),
  toggleMotivoCierreActivo: (id: string, activo: boolean) =>
    apiClient.patch<ConfiguracionRecord>(
      `/api/v1/motivos-cierre/${id}/activo`,
      { activo },
    ),
  eliminarMotivoCierre: (id: string) =>
    deleteResource(`/api/v1/motivos-cierre/${id}`),
};
