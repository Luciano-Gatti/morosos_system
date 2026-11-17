import type { Grupo, GrupoDistrito } from "@/types/grupos";

type UnknownRecord = Record<string, unknown>;

export const asConfiguracionRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const toStringOr = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value : fallback;

export function mapGrupoDistritoConfig(
  value: unknown,
): GrupoDistrito & { id?: string; grupoId?: string } {
  const row = asConfiguracionRecord(value);
  return {
    id: row.id !== undefined && row.id !== null ? String(row.id) : undefined,
    grupoId:
      row.grupoId !== undefined && row.grupoId !== null
        ? String(row.grupoId)
        : undefined,
    distritoId:
      row.distritoId !== undefined && row.distritoId !== null
        ? String(row.distritoId)
        : undefined,
    distrito: toStringOr(row.distritoNombre ?? row.distrito, "-"),
    seguimientoHabilitado: Boolean(
      row.seguimientoHabilitado ?? row.activo ?? false,
    ),
    inmuebles: Number(row.inmuebles ?? row.totalInmuebles ?? 0),
  };
}

export function mapGrupo(
  value: unknown,
  distritos: GrupoDistrito[] = [],
): Grupo {
  const row = asConfiguracionRecord(value);
  return {
    id: String(row.id ?? ""),
    nombre: toStringOr(row.nombre ?? row.grupo, "-"),
    descripcion:
      typeof row.descripcion === "string" ? row.descripcion : undefined,
    activo: Boolean(row.activo ?? true),
    actualizado: toStringOr(row.actualizado ?? row.updatedAt, "-"),
    distritos,
  };
}

export function mapDistrito(
  value: unknown,
): { id: string; nombre: string; activo: boolean } {
  const row = asConfiguracionRecord(value);
  return {
    id: String(row.id ?? ""),
    nombre: toStringOr(row.nombre ?? row.distrito, "-"),
    activo: Boolean(row.activo ?? true),
  };
}

export interface DistritoCatalogo {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface GrupoDistritoRelacion {
  grupoId: string;
  distritoId: string;
  seguimientoHabilitado: boolean;
}

const nestedId = (value: unknown): unknown => asConfiguracionRecord(value).id;

export function mapGrupoDistritoRelacion(
  value: unknown,
): GrupoDistritoRelacion {
  const row = asConfiguracionRecord(value);
  return {
    grupoId: String(row.grupoId ?? nestedId(row.grupo) ?? ""),
    distritoId: String(row.distritoId ?? nestedId(row.distrito) ?? ""),
    seguimientoHabilitado: Boolean(
      row.seguimientoHabilitado ?? row.seguimiento_habilitado ?? false,
    ),
  };
}

const formatUpdatedAt = (value: unknown): string => {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-AR");
};

export function normalizeConfiguracionGrupos(
  rawGrupos: unknown[],
  rawDistritos: unknown[],
  rawConfiguraciones: unknown[],
): { grupos: Grupo[]; distritos: DistritoCatalogo[] } {
  const distritos = rawDistritos
    .map(mapDistrito)
    .filter((distrito) => distrito.id && distrito.nombre);
  const distritosById = new Map(distritos.map((distrito) => [distrito.id, distrito]));
  const configuracionesByGrupo = new Map<string, UnknownRecord[]>();

  rawConfiguraciones.map(asConfiguracionRecord).forEach((configuracion) => {
    const grupoId = String(
      configuracion.grupoId ??
        nestedId(configuracion.grupo) ??
        configuracion.grupo_id ??
        "",
    );
    if (!grupoId) return;
    const actuales = configuracionesByGrupo.get(grupoId) ?? [];
    actuales.push(configuracion);
    configuracionesByGrupo.set(grupoId, actuales);
  });

  const grupos = rawGrupos.map((value) => {
    const row = asConfiguracionRecord(value);
    const grupoId = String(row.id ?? "");
    const relaciones = configuracionesByGrupo.get(grupoId) ?? [];
    const grupoDistritos: GrupoDistrito[] = relaciones.map((relacion) => {
      const distritoId = String(
        relacion.distritoId ??
          nestedId(relacion.distrito) ??
          relacion.distrito_id ??
          "",
      );
      const distritoRecord = asConfiguracionRecord(relacion.distrito);
      const distritoCatalogo = distritosById.get(distritoId);
      const distritoNombre = toStringOr(
        distritoCatalogo?.nombre ??
          distritoRecord.nombre ??
          distritoRecord.distrito ??
          relacion.distritoNombre ??
          relacion.distrito_codigo ??
          distritoId,
        "-",
      );

      return {
        distrito: distritoNombre,
        seguimientoHabilitado: Boolean(
          relacion.seguimientoHabilitado ??
            relacion.seguimiento_habilitado ??
            false,
        ),
        inmuebles: Number(relacion.inmuebles ?? 0),
        configId:
          relacion.id !== undefined && relacion.id !== null
            ? String(relacion.id)
            : undefined,
        distritoId: distritoId || undefined,
      };
    });

    return {
      ...mapGrupo(row, grupoDistritos),
      actualizado: formatUpdatedAt(row.updatedAt ?? row.actualizado),
    };
  });

  return { grupos, distritos };
}
