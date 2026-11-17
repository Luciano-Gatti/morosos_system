import { describe, expect, it } from "vitest";

import {
  mapReporteAccionesFechas,
  mapReporteAccionesRegularizacionDetallado,
  mapReporteEstadoInmuebles,
  mapReporteHistorialMovimientos,
  mapReporteMorosos,
} from "@/adapters/reportes";

describe("adaptadores de reportes", () => {
  it("acepta aliases del reporte de morosos y ordena por grupo y distrito", () => {
    const reporte = mapReporteMorosos({
      porGrupo: [
        {
          grupoNombre: "Grupo B",
          distritoNombre: "Distrito 2",
          totalPadron: "20",
          morosos: "4",
          porcentajeMorosidad: "20",
        },
        {
          grupoNombre: "Grupo A",
          distritoNombre: "Distrito 1",
          padron: 10,
          morosos: 1,
          porcentaje: 10,
        },
      ],
      totalPadron: "30",
      totalMorosos: "5",
      porcentajeMorosidadGeneral: "16.67",
    });

    expect(reporte.grupos.map((row) => row.grupo)).toEqual(["Grupo A", "Grupo B"]);
    expect(reporte.grupos[0].etiqueta).toBe("Grupo A — Distrito 1");
    expect(reporte.total).toMatchObject({
      totalInmuebles: 30,
      morosos: 5,
      porcentajeMorosidad: 16.67,
    });
  });

  it("calcula saldos de acciones y descarta valores incompatibles", () => {
    const [accion] = mapReporteAccionesFechas({
      content: [
        {
          id: 10,
          fecha: "2026-06-19",
          tipoAccionLabel: "Plan de pago",
          cantidadCuotas: "12",
          cuotasPagadas: "3",
          montoTotalPlan: "120000",
          montoPagado: "30000",
          observacion: 123,
        },
      ],
    });

    expect(accion).toMatchObject({
      id: "10",
      cantidadCuotas: 12,
      cuotasPagadas: 3,
      cuotasPendientes: 9,
      montoTotalPlan: 120000,
      montoPagado: 30000,
      montoPendiente: 90000,
      observacion: null,
    });
  });

  it("unifica regularizaciones, planes y compromisos con contratos estables", () => {
    const reporte = mapReporteAccionesRegularizacionDetallado({
      regularizaciones: {
        content: [
          {
            cuenta: "100",
            fechaCierre: "2026-06-10",
            usuarioResponsable: "operador",
          },
        ],
      },
      planesPago: {
        content: [
          {
            cuenta: "200",
            fechaAlta: "2026-06-11",
            cantidadCuotas: 6,
            montoTotal: 60000,
          },
        ],
      },
      compromisos: {
        content: [{ cuenta: "300", fechaDesde: "2026-06-12" }],
      },
    });

    expect(reporte.rows.map((row) => row.tipo)).toEqual([
      "Regularización",
      "Plan de pago",
      "Compromiso de pago",
    ]);
    expect(reporte.planesDePago[0]).toMatchObject({
      cuenta: "200",
      cuotas: 6,
      montoTotal: 60000,
    });
    expect(reporte.compromisosDePago[0].responsable).toBe("Sistema");
  });

  it("normaliza estados y tipos de movimientos desconocidos", () => {
    const estados = mapReporteEstadoInmuebles({
      rows: [
        { cuenta: "1", estado: "AL_DIA" },
        { cuenta: "2", estado: "deudor" },
        { cuenta: "3", estado: "MOROSO" },
      ],
    });
    const movimientos = mapReporteHistorialMovimientos({
      movimientos: [
        { action: "AVISO-CORTE" },
        { action: "TIPO_FUTURO" },
      ],
    });

    expect(estados.rows.map((row) => row.estado)).toEqual([
      "Al día",
      "Deudor",
      "Moroso",
    ]);
    expect(movimientos.map((row) => row.tipo)).toEqual([
      "aviso_corte",
      "configuracion",
    ]);
  });
});
