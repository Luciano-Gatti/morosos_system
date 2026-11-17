import { describe, expect, it } from "vitest";

import {
  mapCargaDeuda,
  mapErrorImportacion,
  mapInmuebleCarga,
} from "@/adapters/deuda";

describe("adaptadores de deuda", () => {
  it("normaliza una carga usando aliases del backend", () => {
    const carga = mapCargaDeuda({
      cargaId: 10,
      fechaCarga: "2026-06-19T10:00:00Z",
      archivo: "deuda-junio.xlsx",
      operador: "admin",
      estado: "COMPLETADA_CON_ERRORES",
      totalMorosos: "25",
      totalMonto: "150000",
      registrosProcesados: "100",
      registrosCreados: "20",
      totalErrores: "3",
      totalNoEncontradas: "2",
    });

    expect(carga).toMatchObject({
      id: "10",
      nombre: "deuda-junio.xlsx",
      usuario: "admin",
      estado: "con_errores",
      morosos: 25,
      montoTotal: 150000,
      procesados: 100,
      creados: 20,
      errores: 3,
      noEncontradas: 2,
    });
  });

  it("normaliza detalles e incidencias con valores seguros", () => {
    expect(
      mapInmuebleCarga({
        idCuenta: "A-10",
        cuotasVencidas: "4",
        montoVencido: "25000",
      }),
    ).toEqual({
      cuenta: "A-10",
      titular: "-",
      direccion: "-",
      cuotas: 4,
      monto: 25000,
    });

    expect(
      mapErrorImportacion(
        { cuenta: "A-10", descripcionError: "Cuenta inexistente" },
        2,
      ),
    ).toEqual({
      fila: 3,
      cuenta: "A-10",
      descripcion: "Cuenta inexistente",
    });
  });
});
