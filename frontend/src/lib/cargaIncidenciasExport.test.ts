import { describe, expect, it } from "vitest";

import { incidenciasToCsv, incidenciasToJson } from "@/lib/cargaIncidenciasExport";
import type { CargaIncidencia } from "@/types/cargas";

const row: CargaIncidencia = {
  id: "inc-1",
  cargaId: "carga-1",
  fila: 12,
  cuenta: "=2+2",
  resultado: "CONFLICTO",
  codigo: "DATO_DISTINTO",
  mensaje: 'Valor "diferente", revisar',
  payload: { anterior: 10, nuevo: 20 },
  createdBy: "operador",
  createdAt: "2026-06-19T12:00:00Z",
};

describe("exportación de incidencias", () => {
  it("genera CSV escapado y evita fórmulas", () => {
    const csv = incidenciasToCsv([row]);

    expect(csv).toContain('"\'=2+2"');
    expect(csv).toContain('"Valor ""diferente"", revisar"');
    expect(csv).toContain('"{""anterior"":10,""nuevo"":20}"');
  });

  it("genera JSON legible con payload", () => {
    const json = incidenciasToJson([row]);

    expect(JSON.parse(json)).toEqual([row]);
    expect(json).toContain("\n  ");
  });
});
