export interface InmuebleRowVm {
  id: string;
  cuenta: string;
  titular: string;
  direccion: string;
  grupoId: string;
  grupoCodigo: string;
  grupoNombre: string;
  distritoId: string;
  distritoCodigo: string;
  distritoNombre: string;
  activo: boolean;
  seguimientoHabilitado: boolean;
  telefono: string;
  email: string;
  observaciones: string;
  estadoLabel: string;
}

const s = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const b = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const id = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

export function mapInmuebleRow(value: unknown): InmuebleRowVm {
  const input = asRecord(value);
  const activo = b(input.activo, true);
  return {
    id: id(input.id),
    cuenta: s(input.cuenta, "-"),
    titular: s(input.titular, "-"),
    direccion: s(input.direccion, "-"),
    grupoId: id(input.grupoId),
    grupoCodigo: s(input.grupoCodigo),
    grupoNombre: s(input.grupoNombre ?? input.grupo, "-"),
    distritoId: id(input.distritoId),
    distritoCodigo: s(input.distritoCodigo),
    distritoNombre: s(input.distritoNombre ?? input.distrito, "-"),
    activo,
    seguimientoHabilitado: b(input.seguimientoHabilitado, false),
    telefono: s(input.telefono),
    email: s(input.email),
    observaciones: s(input.observaciones),
    estadoLabel: activo ? "Activo" : "Inactivo",
  };
}
