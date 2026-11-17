export type ParametroSeguimiento = {
  codigo: string;
  nombre: string;
  descripcion?: string;
  valor: string | number | boolean;
  tipoDato?: "NUMBER" | "BOOLEAN" | "STRING";
  min?: number;
  max?: number;
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function mapParametroSeguimiento(value: unknown): ParametroSeguimiento {
  const row = asRecord(value);
  const tipo = String(row.tipoDato ?? "").toUpperCase();
  const descripcion = row.descripcion ?? row.observacion;
  const valor =
    typeof row.valor === "string" ||
    typeof row.valor === "number" ||
    typeof row.valor === "boolean"
      ? row.valor
      : "";

  return {
    codigo: String(row.codigo ?? row.key ?? ""),
    nombre: String(row.nombre ?? row.codigo ?? "Parámetro"),
    descripcion:
      typeof descripcion === "string" ? descripcion : undefined,
    valor,
    tipoDato:
      tipo === "NUMBER" || tipo === "BOOLEAN" || tipo === "STRING"
        ? tipo
        : undefined,
    min: toOptionalNumber(row.minimo ?? row.min),
    max: toOptionalNumber(row.maximo ?? row.max),
  };
}
