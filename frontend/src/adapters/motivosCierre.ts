import type { MotivoCierre } from "@/types/configuracion";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

export function mapMotivoCierre(value: unknown): MotivoCierre {
  const row = asRecord(value);
  const descripcion = row.descripcion ?? row.observacion;
  return {
    id: String(row.id ?? ""),
    codigo: typeof row.codigo === "string" ? row.codigo : undefined,
    nombre: typeof row.nombre === "string" ? row.nombre : "Motivo",
    descripcion:
      typeof descripcion === "string" ? descripcion : undefined,
    activo: Boolean(row.activo ?? true),
    isSystem: Boolean(row.isSystem ?? row.sistema ?? false),
    usos: Number(row.usos ?? row.cantidadUsos ?? 0),
  };
}
