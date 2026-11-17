import { describe, expect, it } from "vitest";

import { mapInmuebleDetalle } from "@/adapters/inmuebleDetalle";

describe("mapInmuebleDetalle", () => {
  it("mantiene la marca de prueba independiente del estado activo", () => {
    expect(mapInmuebleDetalle({ activo: true, esPrueba: true })).toMatchObject({ activo: true, esPrueba: true });
    expect(mapInmuebleDetalle({ activo: false, esPrueba: false })).toMatchObject({ activo: false, esPrueba: false });
    expect(mapInmuebleDetalle({})).toMatchObject({ esPrueba: false });
  });
  it("normaliza identificadores y resumen operativo", () => {
    const detalle = mapInmuebleDetalle({
      id: 10,
      cuenta: "A-100",
      titular: "Ana Pérez",
      grupoId: 20,
      grupo: "Residencial",
      distritoId: 30,
      distrito: "Centro",
      activo: false,
      seguimientoHabilitado: true,
      resumenOperativo: {
        ultimaGestion: "2026-06-18T10:00:00Z",
        etapaActualNombre: "Intimación",
        periodosAdeudados: "4",
        montoAdeudado: "125000",
      },
    });

    expect(detalle).toMatchObject({
      id: "10",
      grupoId: "20",
      grupoNombre: "Residencial",
      distritoId: "30",
      distritoNombre: "Centro",
      estadoLabel: "Inactivo",
      seguimientoLabel: "Habilitado",
      resumenOperativo: {
        etapaActualNombre: "Intimación",
        periodosAdeudados: 4,
        montoAdeudado: 125000,
      },
    });
  });

  it("evita NaN y aplica valores seguros ante una respuesta inválida", () => {
    const detalle = mapInmuebleDetalle({
      resumenOperativo: {
        periodosAdeudados: "invalido",
        montoAdeudado: null,
      },
    });

    expect(detalle.cuenta).toBe("-");
    expect(detalle.activo).toBe(true);
    expect(detalle.resumenOperativo.periodosAdeudados).toBe(0);
    expect(detalle.resumenOperativo.montoAdeudado).toBe(0);
  });
});
