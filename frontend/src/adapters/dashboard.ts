import type { DashboardResumenDto } from "@/services/api/dashboardApi";
import type { AccionClave } from "@/types/dashboard";

export interface DashboardResumenViewModel {
  actividadMes: {
    regularizacionesYPlanes: number;
    compromisosPago: number;
    montoRecaudado: number;
    deudaVigente: number;
  };
  resumenMorosidad: {
    totalInmuebles: number;
    alDia: number;
    deudores: number;
    morosos: number;
    porcentajeMorosidad: number;
    montoTotalDeuda: number;
  };
  accionesMes: Array<{
    clave: AccionClave;
    label: string;
    cantidad: number;
  }>;
  distritosStats: Array<{
    distritoId: string;
    distritoNombre: string;
    totalInmuebles: number;
    alDia: number;
    deudores: number;
    morosos: number;
    porcentajeMorosidad: number;
    montoTotalDeuda: number;
    avisosDeuda: number;
    avisosCorte: number;
    intimaciones: number;
    cortes: number;
  }>;
  ultimosMovimientos: Array<{
    fecha: string;
    tipo: string;
    cuenta: string;
    titular: string;
    etapa: string;
    actorId: string;
    categoria: string;
  }>;
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const asNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asString = (value: unknown, fallback = "-"): string =>
  typeof value === "string" && value.trim() ? value : fallback;

const ACCIONES: Array<{
  clave: AccionClave;
  apiKey: string;
  label: string;
}> = [
  { clave: "avisos_deuda", apiKey: "avisosDeuda", label: "Avisos de deuda" },
  { clave: "avisos_corte", apiKey: "avisosCorte", label: "Avisos de corte" },
  { clave: "intimaciones", apiKey: "intimaciones", label: "Intimaciones" },
  { clave: "cortes", apiKey: "cortes", label: "Cortes" },
];

const toAccionClave = (value: unknown): AccionClave | null => {
  const normalized = asString(value, "")
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, AccionClave> = {
    aviso_deuda: "avisos_deuda",
    avisos_deuda: "avisos_deuda",
    aviso_corte: "avisos_corte",
    avisos_corte: "avisos_corte",
    intimacion: "intimaciones",
    intimaciones: "intimaciones",
    corte: "cortes",
    cortes: "cortes",
  };
  return aliases[normalized] ?? null;
};

const mapAccionesMes = (value: unknown): DashboardResumenViewModel["accionesMes"] => {
  const cantidades = new Map<AccionClave, number>();

  if (Array.isArray(value)) {
    value.map(asRecord).forEach((row) => {
      const clave = toAccionClave(row.clave ?? row.tipo ?? row.codigo);
      if (clave) cantidades.set(clave, asNumber(row.cantidad ?? row.total));
    });
  } else {
    const record = asRecord(value);
    ACCIONES.forEach(({ clave, apiKey }) => {
      cantidades.set(clave, asNumber(record[apiKey] ?? record[clave]));
    });
  }

  return ACCIONES.map(({ clave, label }) => ({
    clave,
    label,
    cantidad: cantidades.get(clave) ?? 0,
  }));
};

export function mapDashboardResumen(
  input: DashboardResumenDto | unknown,
): DashboardResumenViewModel {
  const root = asRecord(input);
  const kpis = asRecord(root.kpis);
  const actividadMes = asRecord(root.actividadMes);
  const totalInmuebles = asNumber(kpis.totalInmuebles);
  const alDia = asNumber(kpis.alDia);
  const deudores = asNumber(kpis.deudores);
  const morosos = asNumber(kpis.morosos);

  const distritosStats = (Array.isArray(root.distritos) ? root.distritos : []).map(
    (value, index) => {
      const distrito = asRecord(value);
      const totalDistrito = asNumber(
        distrito.totalInmuebles ?? distrito.usuarios ?? distrito.totalPadron,
      );
      const deudoresDistrito = asNumber(
        distrito.deudores ?? distrito.bajoUmbral,
      );
      const morososDistrito = asNumber(distrito.morosos ?? distrito.enUmbral);
      const alDiaValue = distrito.alDia ?? distrito.sinDeuda;
      const alDiaDistrito =
        alDiaValue !== null &&
        alDiaValue !== undefined &&
        alDiaValue !== "" &&
        Number.isFinite(Number(alDiaValue))
          ? asNumber(alDiaValue)
          : Math.max(totalDistrito - deudoresDistrito - morososDistrito, 0);
      const porcentajeInformado = asNumber(distrito.porcentajeMorosidad);
      const porcentajeMorosidad =
        totalDistrito > 0
          ? porcentajeInformado || (morososDistrito / totalDistrito) * 100
          : 0;
      const nombre = asString(
        distrito.distritoNombre ??
          distrito.nombreDistrito ??
          distrito.distrito ??
          distrito.nombre,
        "Distrito sin nombre",
      );

      return {
        distritoId: asString(distrito.distritoId ?? distrito.id, `d-${index}`),
        distritoNombre: nombre,
        totalInmuebles: totalDistrito,
        alDia: alDiaDistrito,
        deudores: deudoresDistrito,
        morosos: morososDistrito,
        porcentajeMorosidad,
        montoTotalDeuda: asNumber(distrito.montoTotalDeuda),
        avisosDeuda: asNumber(distrito.avisosDeuda),
        avisosCorte: asNumber(distrito.avisosCorte),
        intimaciones: asNumber(distrito.intimaciones),
        cortes: asNumber(distrito.cortes),
      };
    },
  );

  const ultimosMovimientos = (
    Array.isArray(root.movimientos) ? root.movimientos : []
  )
    .map(asRecord)
    .map((movimiento) => ({
      fecha: asString(movimiento.fecha),
      tipo: asString(movimiento.tipo),
      cuenta: asString(movimiento.cuenta),
      titular: asString(movimiento.titular),
      etapa: asString(movimiento.etapa),
      actorId: asString(
        movimiento.actorId ?? movimiento.usuario ?? movimiento.actor,
        "Sistema",
      ),
      categoria: asString(movimiento.categoria),
    }));

  return {
    actividadMes: {
      regularizacionesYPlanes: asNumber(actividadMes.regularizacionesYPlanes),
      compromisosPago: asNumber(actividadMes.compromisosPago),
      montoRecaudado: asNumber(actividadMes.montoRecaudado),
      deudaVigente: asNumber(
        actividadMes.deudaVigente ?? kpis.montoTotalDeuda,
      ),
    },
    resumenMorosidad: {
      totalInmuebles,
      alDia,
      deudores,
      morosos,
      porcentajeMorosidad: asNumber(kpis.porcentajeMorosidad),
      montoTotalDeuda: asNumber(kpis.montoTotalDeuda),
    },
    accionesMes: mapAccionesMes(root.accionesMes),
    distritosStats,
    ultimosMovimientos,
  };
}

export function isDashboardResumenEmpty(
  vm: DashboardResumenViewModel,
): boolean {
  const hasKpis =
    vm.resumenMorosidad.totalInmuebles > 0 ||
    vm.resumenMorosidad.deudores > 0 ||
    vm.resumenMorosidad.morosos > 0;
  return !(hasKpis || vm.distritosStats.length > 0);
}
