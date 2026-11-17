export type CargaTipo = "INMUEBLES" | "DEUDA" | "FACTURACION_PAGOS";
export type CargaOrigen = "EXCEL" | "CSV" | "API" | "MANUAL" | "SISTEMA_EXTERNO";
export type CargaEstado = "PENDIENTE" | "PROCESANDO" | "COMPLETADA" | "COMPLETADA_CON_INCIDENCIAS" | "FALLIDA";
export type CargaIncidenciaResultado = "IGNORADO" | "CONFLICTO" | "ERROR" | "NO_ENCONTRADO" | "ADVERTENCIA";

export interface CargaIncidenciaFilters {
  resultado?: CargaIncidenciaResultado;
  cuenta?: string;
  codigo?: string;
  usuario?: string;
  desde?: string;
  hasta?: string;
}

export interface CargaProceso {
  id: string;
  tipo: CargaTipo;
  origen: CargaOrigen;
  sistemaOrigen?: string | null;
  periodoReferencia?: string | null;
  estado: CargaEstado;
  archivoNombre?: string | null;
  procesados: number;
  creados: number;
  facturasConDiferencias?: number | null;
  facturasRepetidasIguales?: number | null;
  actualizados: number;
  sinCambios: number;
  ignorados: number;
  conflictos: number;
  errores: number;
  noEncontrados: number;
  montoTotal: number;
  iniciadoAt: string;
  finalizadoAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface CargaIncidencia {
  id: string;
  cargaId: string;
  fila?: number | null;
  cuenta?: string | null;
  resultado: CargaIncidenciaResultado;
  codigo?: string | null;
  mensaje: string;
  payload?: unknown;
  createdBy?: string | null;
  createdAt: string;
}
