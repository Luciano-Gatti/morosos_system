import { describe, expect, it } from "vitest";

import {
  mapGrupoDistritoRelacion,
  normalizeConfiguracionGrupos,
} from "@/adapters/configuracionGrupos";

describe("normalizeConfiguracionGrupos", () => {
  it("relaciona grupos, distritos y configuraciones por identificador", () => {
    const result = normalizeConfiguracionGrupos(
      [
        {
          id: "grupo-1",
          nombre: "Residencial",
          descripcion: "Clientes residenciales",
          activo: false,
          updatedAt: "2026-06-19T12:00:00Z",
        },
      ],
      [{ id: "distrito-1", nombre: "Centro", activo: true }],
      [
        {
          id: "relacion-1",
          grupoId: "grupo-1",
          distritoId: "distrito-1",
          seguimientoHabilitado: true,
          inmuebles: 25,
        },
      ],
    );

    expect(result.distritos).toEqual([
      { id: "distrito-1", nombre: "Centro", activo: true },
    ]);
    expect(result.grupos[0]).toMatchObject({
      id: "grupo-1",
      nombre: "Residencial",
      descripcion: "Clientes residenciales",
      activo: false,
      distritos: [
        {
          distrito: "Centro",
          seguimientoHabilitado: true,
          inmuebles: 25,
          configId: "relacion-1",
          distritoId: "distrito-1",
        },
      ],
    });
  });

  it("acepta aliases anidados y fechas inválidas sin romper la pantalla", () => {
    const result = normalizeConfiguracionGrupos(
      [{ id: 10, grupo: "Comercial", actualizado: "fecha-invalida" }],
      [{ id: 20, distrito: "Norte" }],
      [
        {
          id: 30,
          grupo: { id: 10 },
          distrito: { id: 20, nombre: "Norte" },
          seguimiento_habilitado: true,
        },
      ],
    );

    expect(result.grupos[0]).toMatchObject({
      id: "10",
      nombre: "Comercial",
      actualizado: "-",
      distritos: [
        {
          distrito: "Norte",
          seguimientoHabilitado: true,
          configId: "30",
          distritoId: "20",
        },
      ],
    });
  });

  it("normaliza la habilitación de seguimiento de una relación", () => {
    expect(
      mapGrupoDistritoRelacion({
        grupo: { id: 10 },
        distrito: { id: 20 },
        seguimiento_habilitado: true,
      }),
    ).toEqual({
      grupoId: "10",
      distritoId: "20",
      seguimientoHabilitado: true,
    });
  });
});
