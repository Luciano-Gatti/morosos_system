import { apiClient } from "@/lib/apiClient";

export interface DashboardResumenDto {
  actividadMes?: {
    regularizacionesYPlanes?: number;
    compromisosPago?: number;
    montoRecaudado?: number;
    deudaVigente?: number;
  };
  kpis?: {
    totalInmuebles?: number;
    alDia?: number;
    deudores?: number;
    morosos?: number;
    porcentajeMorosidad?: number;
    montoTotalDeuda?: number;
  };
  accionesMes?:
    | Array<{ clave?: string; tipo?: string; codigo?: string; cantidad?: number; total?: number }>
    | {
        avisosDeuda?: number;
        avisosCorte?: number;
        intimaciones?: number;
        cortes?: number;
      };
  distritos?: Array<Record<string, unknown>>;
  movimientos?: Array<Record<string, unknown>>;
}

export const dashboardApi = {
  getResumen: () => apiClient.get<DashboardResumenDto>("/api/v1/dashboard/resumen"),
};
