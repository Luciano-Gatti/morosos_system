import type {
  CargaDeuda,
  CargaEstado,
  ErrorImportacion,
  InmuebleCarga,
} from "@/types/deuda";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim() ? value : fallback;

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function mapCargaEstado(value: unknown): CargaEstado {
  const normalized = asString(value).toUpperCase();
  if (normalized === "COMPLETADA") return "completada";
  if (normalized === "COMPLETADA_CON_ERRORES") return "con_errores";
  if (normalized === "FALLIDA") return "fallida";
  return "procesando";
}

export function mapCargaDeuda(value: unknown): CargaDeuda {
  const row = asRecord(value);
  const rawId = row.id ?? row.cargaId;
  return {
    id: rawId === null || rawId === undefined ? "" : String(rawId),
    fecha: asString(
      row.fecha ?? row.fechaCarga ?? row.createdAt,
      new Date(0).toISOString(),
    ),
    nombre: asString(
      row.nombre ?? row.archivo,
      `Carga #${rawId ?? "-"}`,
    ),
    usuario: asString(row.usuario ?? row.operador, "-"),
    estado: mapCargaEstado(row.estado),
    morosos: asNumber(row.morosos ?? row.totalMorosos),
    montoTotal: asNumber(row.montoTotal ?? row.totalMonto),
    procesados: asNumber(row.procesados ?? row.registrosProcesados),
    creados: asNumber(row.creados ?? row.registrosCreados),
    actualizados: asNumber(row.actualizados),
    errores: asNumber(row.errores ?? row.totalErrores),
    noEncontradas: asNumber(row.noEncontradas ?? row.totalNoEncontradas),
  };
}

export function mapInmuebleCarga(value: unknown): InmuebleCarga {
  const row = asRecord(value);
  return {
    cuenta: asString(row.cuenta ?? row.idCuenta, "-"),
    titular: asString(row.titular, "-"),
    direccion: asString(row.direccion, "-"),
    cuotas: asNumber(row.cuotas ?? row.cuotasVencidas),
    monto: asNumber(row.monto ?? row.montoVencido),
  };
}

export function mapErrorImportacion(
  value: unknown,
  index = 0,
): ErrorImportacion {
  const row = asRecord(value);
  return {
    fila: asNumber(row.fila) || index + 1,
    cuenta: asString(row.cuenta, "-"),
    descripcion: asString(
      row.descripcion ??
        row.descripcionError ??
        row.mensaje ??
        row.error ??
        row.detalle,
      "Sin detalle informado por el backend",
    ),
  };
}
