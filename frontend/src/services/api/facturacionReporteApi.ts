import { apiClient, buildQueryParams } from "@/lib/apiClient";
export interface IndicadoresFacturacion {
  recaudadoCaudalimetros: number; conceptosCaudalimetroPagados: number; cuentasCaudalimetros: number;
  descuentosDocumentados: number; descuentosARevisar: number;
  descuentosPorBeneficio: Record<string, { conceptos: number; importe: number; sinImporte: number }>;
  facturadoNormal: number | null; facturadoPlanes: number | null; facturadoOtros: number | null;
  facturado: number | null; recaudado: number; conceptosEmitidos: number; conceptosSinImporte: number;
  conceptosPagados: number; cuentasPagaron: number; recaudadoNormal: number; recaudadoPlanes: number;
  conceptosNormalesPagados: number; conceptosPlanPagados: number; cuentasNormales: number; cuentasPlanes: number;
}
export interface FiltrosFacturacion { desde: string; hasta: string; grupoId: string; distritoId: string; conceptos?: string[]; cumplimiento?: string[]; tipo?: "TODOS" | "NORMAL" | "PLAN" | "CAUDALIMETRO" | "VIGENTE" | "VENCIDO" | "OTROS" }
export interface PagoReporte {
  cuenta: string; numero: string; grupo: string; tipo: string;
  fechaEmision: string | null; fechaVencimiento: string | null; fechaPago: string;
  importe: number; cumplimiento: "EN_TERMINO" | "FUERA_TERMINO" | "SIN_FECHA"; diasAtraso: number | null;
}
export interface ReporteFacturacion {
  reporte: { pagos: PagoReporte[]; emisionesEstimadas: number; desde: string; hasta: string; totales: IndicadoresFacturacion;
    dias: { mes: string; indicadores: IndicadoresFacturacion }[];
    meses: { mes: string; indicadores: IndicadoresFacturacion }[];
    grupos: { id: string; nombre: string; indicadores: IndicadoresFacturacion }[] };
  distritosDisponibles: { id: string; nombre: string }[];
  gruposDisponibles: { id: string; nombre: string }[];
}
export const facturacionReporteApi = {
  detalle: (filters: FiltrosFacturacion, mes: string, movimiento: "FACTURACION" | "RECAUDACION") => apiClient.get<DetalleMovimiento>(`/api/v1/reportes/facturacion-recaudacion/detalle${buildQueryParams({ ...filters, mes, movimiento, conceptos: filters.conceptos?.join(",") || "NINGUNO", cumplimiento: filters.cumplimiento?.join(",") || "NINGUNO" })}`),
  obtener: (filters: FiltrosFacturacion) => apiClient.get<ReporteFacturacion>(`/api/v1/reportes/facturacion-recaudacion${buildQueryParams({ ...filters, conceptos: filters.conceptos?.join(",") || (filters.conceptos ? "NINGUNO" : undefined), cumplimiento: filters.cumplimiento?.join(",") || (filters.cumplimiento ? "NINGUNO" : undefined) })}`),
};
export interface FilaMovimiento {
  cuenta: string; titular: string; numero: string; tipo: string; periodo: string; grupo: string;
  fechaEmision: string | null; fechaVencimiento: string | null; fechaPago: string | null;
  neto: number | null; iva: number | null; descuento: number | null; importe: number | null; cumplimiento: string;
}
export interface DetalleMovimiento { filas: FilaMovimiento[]; total: number | null; cuentas: number; sinImporte: number }
export interface SeleccionMovimiento {
  mes: string; movimiento: "FACTURACION" | "RECAUDACION"; titulo: string; esperado: number | null;
  conceptos?: string[]; cumplimiento?: string[];
}
