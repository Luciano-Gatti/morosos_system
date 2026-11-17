import { asRecord, stringOrNull } from "@/lib/responseValues";
export type SeguimientoRow = {
  id: string;
  casoId: string;
  inmuebleId: string;
  cuenta: string;
  titular: string;
  direccion: string;
  grupo: string;
  distrito: string;
  cuotasAdeudadas: number;
  montoAdeudado: number;
  etapa: string | null;
  estado: "No iniciado" | "Iniciado" | "Pausado" | "Cerrado";
  fechaProgramada: string | null;
  accionesDisponibles?: {
    puedeIniciar?: boolean;
    puedeAvanzar?: boolean;
    puedeRepetir?: boolean;
    puedePausar?: boolean;
    puedeReabrir?: boolean;
    puedeCerrar?: boolean;
    puedeRegistrarCompromiso?: boolean;
  } | null;
};

export function mapEstadoCasoLabel(value: string): SeguimientoRow["estado"] {
  const v = (value ?? "").toUpperCase();
  if (v === "INICIADO" || v === "ABIERTO" || v === "ACTIVO") return "Iniciado";
  if (v === "PAUSADO") return "Pausado";
  if (v === "CERRADO") return "Cerrado";
  return "No iniciado";
}

export function mapSeguimientoBandejaRow(value: unknown): SeguimientoRow {
  const row = asRecord(value);
  const acciones = asRecord(row.accionesDisponibles);
  return {
    id: String(row.id ?? row.casoId ?? row.inmuebleId ?? ""),
    casoId: row.casoId ? String(row.casoId) : "",
    inmuebleId: String(row.inmuebleId ?? row.idInmueble ?? ""),
    cuenta: String(row.cuenta ?? "-"),
    titular: String(row.titular ?? "-"),
    direccion: String(row.direccion ?? "-"),
    grupo: String(row.grupo ?? "-"),
    distrito: String(row.distrito ?? "-"),
    cuotasAdeudadas: Number(row.cuotasAdeudadas ?? row.cuotasVencidas ?? 0),
    montoAdeudado: Number(row.montoAdeudado ?? row.montoVencido ?? 0),
    etapa: String(row.etapaActual ?? row.etapa ?? "").trim() || null,
    estado: mapEstadoCasoLabel(String(row.estadoCaso ?? row.estado ?? "")),
    fechaProgramada: stringOrNull(row.fechaProgramada),
    accionesDisponibles:
      row && typeof row.accionesDisponibles === "object" && !Array.isArray(row.accionesDisponibles)
        ? Object.fromEntries(Object.entries(acciones).filter(([, value]) => typeof value === "boolean"))
        : null,
  };
}
