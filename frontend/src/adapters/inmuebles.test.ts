import { describe, expect, it } from "vitest";

import { mapInmuebleRow } from "@/adapters/inmuebles";

describe("mapInmuebleRow", () => {
  it("normaliza aliases y convierte identificadores numéricos", () => {
    const row = mapInmuebleRow({
      id: 10,
      cuenta: "A-100",
      titular: "Ana Pérez",
      direccion: "Calle 1",
      grupoId: 20,
      grupo: "Residencial",
      distritoId: 30,
      distrito: "Centro",
      activo: false,
      seguimientoHabilitado: true,
    });

    expect(row).toMatchObject({
      id: "10",
      cuenta: "A-100",
      grupoId: "20",
      grupoNombre: "Residencial",
      distritoId: "30",
      distritoNombre: "Centro",
      activo: false,
      seguimientoHabilitado: true,
      estadoLabel: "Inactivo",
    });
  });

  it("aplica valores seguros ante datos incompletos", () => {
    const row = mapInmuebleRow(null);

    expect(row).toMatchObject({
      id: "",
      cuenta: "-",
      titular: "-",
      direccion: "-",
      activo: true,
      seguimientoHabilitado: false,
      estadoLabel: "Activo",
    });
  });
});
