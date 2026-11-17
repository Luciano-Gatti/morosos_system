import type {
  AccionRegistro,
  AccionTipo,
  AccionesRegularizacionViewModel,
  EstadoInmueble,
  InmuebleEstadoRow,
  MorosidadPorcentajeTotal,
  MorososPorDistritoRow,
  MorososPorGrupoRow,
  MovimientoRegistro,
  MovimientoTipo,
} from "@/types/reportes";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const firstArray = (...values: unknown[]): unknown[] => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
  }
  return [];
};

const toNum = (value: unknown, defaultValue = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const toNullableNum = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStr = (value: unknown, defaultValue = ""): string =>
  typeof value === "string" ? value : defaultValue;

const toNullableStr = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const toDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date(0) : value;
  }
  if (typeof value !== "string" && typeof value !== "number") return new Date(0);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

const toNullableDate = (value: unknown): Date | null =>
  value === null || value === undefined || value === "" ? null : toDate(value);

const toUsuarioResponsable = (value: unknown): string => {
  const usuario = toStr(value).trim();
  return usuario || "Sistema";
};

const toEstadoInmueble = (value: unknown): EstadoInmueble => {
  const estado = toStr(value)
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  if (estado === "moroso") return "Moroso";
  if (estado === "deudor") return "Deudor";
  return "Al día";
};

const MOVIMIENTO_TIPOS = new Set<MovimientoTipo>([
  "intimacion",
  "corte",
  "regularizacion",
  "plan_pago",
  "compromiso",
  "aviso_deuda",
  "aviso_corte",
  "configuracion",
]);

const toMovimientoTipo = (value: unknown): MovimientoTipo => {
  const tipo = toStr(value)
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");

  return MOVIMIENTO_TIPOS.has(tipo as MovimientoTipo)
    ? (tipo as MovimientoTipo)
    : "configuracion";
};

export interface ReporteMorososViewModel {
  grupos: MorososPorGrupoRow[];
  distritos: MorososPorDistritoRow[];
  total: MorosidadPorcentajeTotal;
  parametroCuotasMoroso: number;
}

export interface EstadoInmueblesViewModel {
  rows: InmuebleEstadoRow[];
  totales: {
    totalInmuebles: number;
    alDia: number;
    deudores: number;
    morosos: number;
    deudaTotal: number;
  };
  distribucion: {
    estado: string;
    cantidad: number;
    porcentaje: number;
  }[];
  parametroCuotasMoroso: number;
}

export function mapReporteMorosos(payload: unknown): ReporteMorososViewModel {
  const root = asRecord(payload);
  const gruposRaw = firstArray(
    root.porDistritoGrupo,
    root.grupos,
    root.porGrupo,
    root.filas,
    root.content,
  );
  const distritosRaw = firstArray(root.distritos, root.porDistrito);

  const grupos = gruposRaw
    .map(asRecord)
    .map((row): MorososPorGrupoRow => {
      const grupo = toStr(row.grupo ?? row.grupoNombre);
      const distrito = toStr(row.distrito ?? row.distritoNombre);
      return {
        grupo,
        distrito,
        etiqueta: toStr(row.etiqueta, `${grupo} — ${distrito}`),
        totalInmuebles: toNum(row.totalInmuebles ?? row.totalPadron ?? row.padron),
        deudores: toNum(row.deudores),
        morosos: toNum(row.morosos),
        porcentaje: toNum(row.porcentaje ?? row.porcentajeMorosidad),
      };
    })
    .sort((a, b) => {
      const grupoCmp = a.grupo.localeCompare(b.grupo, "es", { sensitivity: "base" });
      return grupoCmp !== 0
        ? grupoCmp
        : a.distrito.localeCompare(b.distrito, "es", { sensitivity: "base" });
    });

  const distritos = distritosRaw.map(asRecord).map(
    (row): MorososPorDistritoRow => ({
      distrito: toStr(row.distrito ?? row.distritoNombre),
      totalInmuebles: toNum(row.totalInmuebles ?? row.padron),
      deudores: toNum(row.deudores),
      morosos: toNum(row.morosos),
      porcentaje: toNum(row.porcentaje ?? row.porcentajeMorosidad),
    }),
  );

  return {
    grupos,
    distritos,
    total: {
      totalInmuebles: toNum(root.totalInmuebles ?? root.totalPadron),
      deudores: toNum(root.deudores ?? root.totalDeudores),
      morosos: toNum(root.morosos ?? root.totalMorosos),
      alDia: toNum(root.alDia ?? root.totalAlDia),
      porcentajeMorosidad: toNum(
        root.porcentajeMorosidad ?? root.porcentajeMorosidadGeneral,
      ),
    },
    parametroCuotasMoroso: toNum(root.parametroCuotasMoroso),
  };
}

export function mapReporteAccionesFechas(payload: unknown): AccionRegistro[] {
  const root = asRecord(payload);
  const detalle = asRecord(root.detalle);
  const detailRows = firstArray(detalle.content, root.detalle);
  const groupedRows = [
    ...asArray(root.avisosDeuda),
    ...asArray(root.intimaciones),
    ...asArray(root.avisosCorte),
    ...asArray(root.cortes),
    ...asArray(root.regularizaciones),
    ...asArray(root.planesDePago),
  ];
  const rows =
    detailRows.length > 0
      ? [...detailRows, ...groupedRows]
      : firstArray(root.content, root.rows, groupedRows);

  return rows.map(asRecord).map((row): AccionRegistro => {
    const cantidadCuotas = toNullableNum(
      row.cantidadCuotas ?? row.totalCuotas ?? row.cuotas,
    );
    const cuotasPagadas = toNullableNum(
      row.cuotasPagadas ?? row.cuotasPagadasIniciales,
    );
    const montoTotalPlan = toNullableNum(row.montoTotalPlan ?? row.montoTotal);
    const montoPagado = toNullableNum(row.montoPagado);

    return {
      id: String(row.id ?? row.accionId ?? ""),
      fecha: toDate(row.fecha ?? row.fechaAccion),
      tipo: toStr(row.tipoAccionLabel ?? row.tipo ?? row.tipoAccion),
      codigo:
        toStr(row.codigo ?? row.tipoAccionCodigo ?? row.tipoAccion ?? row.eventoTipo) ||
        undefined,
      cuenta: toStr(row.cuenta),
      titular: toStr(row.titular),
      grupo: toStr(row.grupoNombre ?? row.grupo),
      distrito: toStr(row.distritoNombre ?? row.distrito),
      usuario: toUsuarioResponsable(
        row.usuarioResponsable ?? row.createdBy ?? row.actorId ?? row.usuario ?? row.actor,
      ),
      observacion: toNullableStr(row.observacion ?? row.observaciones),
      montoPagado,
      montoComprometido: toNullableNum(row.montoComprometido),
      fechaDesde: toNullableDate(row.fechaDesde),
      fechaHasta: toNullableDate(row.fechaHasta),
      estado: toNullableStr(row.estadoLabel ?? row.estado),
      fechaAlta: toNullableDate(row.fechaAlta ?? row.fecha),
      montoTotalPlan,
      cantidadCuotas,
      valorCuota: toNullableNum(row.valorCuota),
      cuotasPagadas,
      saldoPendiente: toNullableNum(row.saldoPendiente),
      cuotasPendientes:
        toNullableNum(row.cuotasPendientes) ??
        (cantidadCuotas !== null && cuotasPagadas !== null
          ? cantidadCuotas - cuotasPagadas
          : null),
      montoPendiente:
        toNullableNum(row.montoPendiente) ??
        (montoTotalPlan !== null && montoPagado !== null
          ? montoTotalPlan - montoPagado
          : null),
      proximoVencimiento: toNullableDate(
        row.proximoVencimiento ?? row.fechaVencimientoPrimeraCuota,
      ),
      vencimientoFinal: toNullableDate(
        row.vencimientoFinal ?? row.fechaVencimientoFinal,
      ),
    };
  });
}

export function mapReporteAccionesRegularizacion(payload: unknown): AccionRegistro[] {
  return mapReporteAccionesRegularizacionDetallado(payload).rows;
}

export function mapReporteAccionesRegularizacionDetallado(
  payload: unknown,
): AccionesRegularizacionViewModel {
  const root = asRecord(payload);
  const planesPago = asRecord(root.planesPago);
  const compromisosRoot = asRecord(root.compromisos);
  const regularizacionesRoot = asRecord(root.regularizaciones);
  const porTipoRaw = asArray(root.porTipo);
  const planesRaw = firstArray(planesPago.content, root.planesDePago);
  const compromisosRaw = firstArray(
    compromisosRoot.content,
    root.compromisosDePago,
  );
  const regularizacionesRaw = firstArray(
    regularizacionesRoot.content,
    root.regularizaciones,
  );

  const regularizaciones: AccionRegistro[] = regularizacionesRaw
    .map(asRecord)
    .map((row, index) => ({
      id: String(
        row.casoSeguimientoId ??
          row.inmuebleId ??
          row.cuenta ??
          `regularizacion-${index}`,
      ),
      fecha: toDate(row.fechaCierre ?? row.fecha),
      tipo: "Regularización",
      cuenta: toStr(row.cuenta),
      titular: toStr(row.titular),
      grupo: toStr(row.grupoNombre ?? row.grupo),
      distrito: toStr(row.distritoNombre ?? row.distrito),
      usuario: toUsuarioResponsable(
        row.usuarioResponsable ?? row.actorId ?? row.usuario ?? row.responsable,
      ),
      montoPagado: toNullableNum(row.montoPagado),
      observacion: toNullableStr(row.observacion),
    }));

  const planes: AccionesRegularizacionViewModel["planesDePago"] = planesRaw
    .map(asRecord)
    .map((row) => ({
      fechaAlta: toDate(row.fechaCierre ?? row.fechaAlta),
      cuenta: toStr(row.cuenta),
      titular: toStr(row.titular),
      grupo: toStr(row.grupoNombre ?? row.grupo),
      cuotas: toNum(row.cantidadCuotas ?? row.cuotas),
      montoTotal: toNum(row.montoTotal),
      proximoVencimiento: toNullableDate(row.fechaVencimientoPrimeraCuota),
      vencimientoFinal: toNullableDate(row.fechaVencimientoFinal),
      estado: toStr(row.estadoLabel ?? row.estado),
    }));

  const compromisos: AccionesRegularizacionViewModel["compromisosDePago"] =
    compromisosRaw.map(asRecord).map((row) => ({
      fecha: toDate(row.fechaDesde ?? row.fecha),
      cuenta: toStr(row.cuenta),
      titular: toStr(row.titular),
      grupo: toStr(row.grupoNombre ?? row.grupo),
      distrito: toStr(row.distritoNombre ?? row.distrito),
      responsable: toUsuarioResponsable(
        row.actorId ?? row.responsable ?? row.usuario,
      ),
    }));

  const rows: AccionRegistro[] = [
    ...regularizaciones,
    ...planes.map((plan) => ({
      id: `${plan.cuenta}-${plan.fechaAlta.toISOString()}`,
      fecha: plan.fechaAlta,
      tipo: "Plan de pago",
      cuenta: plan.cuenta,
      titular: plan.titular,
      grupo: plan.grupo,
      distrito: "",
      usuario: "Sistema",
      fechaAlta: plan.fechaAlta,
      estado: plan.estado,
      montoTotalPlan: plan.montoTotal,
      cantidadCuotas: plan.cuotas,
      proximoVencimiento: plan.proximoVencimiento,
      vencimientoFinal: plan.vencimientoFinal,
    })),
    ...compromisos.map((compromiso) => ({
      id: `${compromiso.cuenta}-${compromiso.fecha.toISOString()}`,
      fecha: compromiso.fecha,
      tipo: "Compromiso de pago",
      cuenta: compromiso.cuenta,
      titular: compromiso.titular,
      grupo: compromiso.grupo,
      distrito: compromiso.distrito,
      usuario: compromiso.responsable,
    })),
  ];

  const detallePorTipo = porTipoRaw.map(asRecord).map((row) => ({
    tipo: toStr(row.tipoLabel ?? row.tipo, "Regularización") as AccionTipo,
    cantidad: toNum(row.cantidad),
    porcentaje: toNum(row.porcentaje),
  }));

  return {
    rows,
    detallePorTipo,
    planesDePago: planes,
    compromisosDePago: compromisos,
  };
}

export function mapReporteEstadoInmuebles(
  payload: unknown,
): EstadoInmueblesViewModel {
  const root = asRecord(payload);
  const rowsRaw = Array.isArray(payload)
    ? payload
    : firstArray(root.inmuebles, root.filas, root.rows, root.content);
  const totales = asRecord(root.totales);
  const distribucionRaw = asArray(root.distribucion);
  const rows = rowsRaw.map(asRecord).map(
    (row): InmuebleEstadoRow => ({
      cuenta: toStr(row.cuenta),
      titular: toStr(row.titular),
      grupo: toStr(row.grupoNombre ?? row.grupo),
      distrito: toStr(row.distritoNombre ?? row.distrito),
      cuotasAdeudadas: toNum(row.cuotasAdeudadas ?? row.cuotas),
      montoAdeudado: toNum(row.montoAdeudado ?? row.deudaTotal),
      estado: toEstadoInmueble(row.estado),
      etapa: toStr(row.etapa ?? row.etapaNombre),
    }),
  );

  return {
    rows,
    parametroCuotasMoroso: toNum(root.parametroCuotasMoroso),
    totales: {
      totalInmuebles: toNum(totales.totalInmuebles, rows.length),
      alDia: toNum(totales.alDia),
      deudores: toNum(totales.deudores),
      morosos: toNum(totales.morosos),
      deudaTotal: toNum(totales.deudaTotal),
    },
    distribucion: distribucionRaw.map(asRecord).map((row) => ({
      estado: toStr(row.estado),
      cantidad: toNum(row.cantidad),
      porcentaje: toNum(row.porcentaje),
    })),
  };
}

export function mapReportePorcentajesMorosidad(
  payload: unknown,
): MorosidadPorcentajeTotal {
  const root = asRecord(payload);
  return {
    totalInmuebles: toNum(root.totalInmuebles),
    deudores: toNum(root.deudores),
    morosos: toNum(root.morosos),
    alDia: toNum(root.alDia),
    porcentajeMorosidad: toNum(root.porcentajeMorosidad ?? root.porcentaje),
  };
}

export function mapReporteHistorialMovimientos(
  payload: unknown,
): MovimientoRegistro[] {
  const root = asRecord(payload);
  const rows = Array.isArray(payload)
    ? payload
    : firstArray(root.content, root.rows, root.movimientos);

  return rows.map(asRecord).map((row, index) => ({
    id: String(row.id ?? row.eventId ?? `mov-${index}`),
    fecha: toStr(row.fecha ?? row.createdAt ?? row.timestamp),
    cuenta: toStr(row.cuenta),
    titular: toStr(row.titular),
    accion: toStr(row.actionLabel ?? row.resumen ?? row.action),
    etapa: toStr(row.etapa ?? row.entityType),
    tipo: toMovimientoTipo(row.action ?? row.tipo),
    usuario: toUsuarioResponsable(row.actorId ?? row.usuario ?? row.actor),
    categoria: "movimiento",
  }));
}
