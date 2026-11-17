export interface InmuebleDetalleViewModel {
  id: string;
  cuenta: string;
  titular: string;
  direccion: string;
  telefono: string;
  email: string;
  observaciones: string;
  activo: boolean;
  esPrueba: boolean;
  beneficioCuenta: string;
  seguimientoHabilitado: boolean;
  grupoId: string;
  grupoCodigo: string;
  grupoNombre: string;
  distritoId: string;
  distritoCodigo: string;
  distritoNombre: string;
  createdAt: string;
  updatedAt: string;
  estadoLabel: string;
  seguimientoLabel: string;
  resumenOperativo: {
    ultimaGestion: string | null;
    etapaActualNombre: string | null;
    estadoProceso: string | null;
    periodosAdeudados: number;
    montoAdeudado: number;
    ultimaCargaDeuda: string | null;
  };
}

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asBool = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const asId = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const asNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function mapInmuebleDetalle(value: unknown): InmuebleDetalleViewModel {
  const input = asRecord(value);
  const resumen = asRecord(input.resumenOperativo);
  const activo = asBool(input.activo, true);
  const seguimientoHabilitado = asBool(input.seguimientoHabilitado);

  return {
    id: asId(input.id),
    cuenta: asString(input.cuenta, "-"),
    titular: asString(input.titular, "-"),
    direccion: asString(input.direccion, "-"),
    telefono: asString(input.telefono),
    email: asString(input.email),
    observaciones: asString(input.observacion ?? input.observaciones),
    activo,
    esPrueba: asBool(input.esPrueba),
    beneficioCuenta: asString(input.beneficioCuenta),
    seguimientoHabilitado,
    grupoId: asId(input.grupoId),
    grupoCodigo: asString(input.grupoCodigo),
    grupoNombre: asString(input.grupoNombre ?? input.grupo, "-"),
    distritoId: asId(input.distritoId),
    distritoCodigo: asString(input.distritoCodigo),
    distritoNombre: asString(input.distritoNombre ?? input.distrito, "-"),
    createdAt: asString(input.createdAt),
    updatedAt: asString(input.updatedAt),
    estadoLabel: activo ? "Activo" : "Inactivo",
    seguimientoLabel: seguimientoHabilitado ? "Habilitado" : "Deshabilitado",
    resumenOperativo: {
      ultimaGestion: asNullableString(resumen.ultimaGestion),
      etapaActualNombre: asNullableString(resumen.etapaActualNombre),
      estadoProceso: asNullableString(resumen.estadoProceso),
      periodosAdeudados: asNumber(resumen.periodosAdeudados),
      montoAdeudado: asNumber(resumen.montoAdeudado),
      ultimaCargaDeuda: asNullableString(resumen.ultimaCargaDeuda),


    },
  };
}
