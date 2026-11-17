import type { EtapaConfig } from "@/types/configuracion";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

export function mapEtapa(value: unknown): EtapaConfig {
  const row = asRecord(value);
  return {
    id: String(row.id ?? ""),
    codigo: String(row.codigo ?? row.nombre ?? row.etapa ?? "etapa"),
    nombre: String(row.nombre ?? row.etapa ?? "Etapa"),
    descripcion:
      typeof row.descripcion === "string" ? row.descripcion : undefined,
    activo: Boolean(row.activo ?? true),
    esFinal: Boolean(row.esFinal ?? false),
    procesosAsociados: Number(row.procesosAsociados ?? row.procesos ?? 0),
  };
}
