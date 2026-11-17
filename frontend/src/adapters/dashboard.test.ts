import { describe, expect, it } from "vitest";

import {
  isDashboardResumenEmpty,
  mapDashboardResumen,
} from "@/adapters/dashboard";

describe("mapDashboardResumen", () => {
  it("normaliza KPIs, actividad y acciones enviadas como objeto", () => {
    const dashboard = mapDashboardResumen({
      actividadMes: {
        regularizacionesYPlanes: 4,
        compromisosPago: 3,
        montoRecaudado: 125000,
      },
      kpis: {
        totalInmuebles: 100,
        alDia: 70,
        deudores: 20,
        morosos: 10,
        porcentajeMorosidad: 10,
        montoTotalDeuda: 500000,
      },
      accionesMes: {
        avisosDeuda: 8,
        avisosCorte: 5,
        intimaciones: 3,
        cortes: 1,
      },
    });

    expect(dashboard.actividadMes.deudaVigente).toBe(500000);
    expect(dashboard.resumenMorosidad.porcentajeMorosidad).toBe(10);
    expect(dashboard.accionesMes).toEqual([
      { clave: "avisos_deuda", label: "Avisos de deuda", cantidad: 8 },
      { clave: "avisos_corte", label: "Avisos de corte", cantidad: 5 },
      { clave: "intimaciones", label: "Intimaciones", cantidad: 3 },
      { clave: "cortes", label: "Cortes", cantidad: 1 },
    ]);
  });

  it("acepta acciones como lista y aliases territoriales", () => {
    const dashboard = mapDashboardResumen({
      accionesMes: [
        { clave: "AVISO-DEUDA", cantidad: 2 },
        { tipo: "intimacion", total: 4 },
      ],
      distritos: [
        {
          id: "distrito-1",
          nombre: "Centro",
          totalPadron: "20",
          bajoUmbral: "5",
          enUmbral: "3",
          montoTotalDeuda: "150000",
        },
      ],
    });

    expect(dashboard.accionesMes.map((accion) => accion.cantidad)).toEqual([
      2, 0, 4, 0,
    ]);
    expect(dashboard.distritosStats[0]).toMatchObject({
      distritoId: "distrito-1",
      distritoNombre: "Centro",
      totalInmuebles: 20,
      alDia: 12,
      deudores: 5,
      morosos: 3,
      porcentajeMorosidad: 15,
      montoTotalDeuda: 150000,
    });
  });

  it("usa valores seguros ante una respuesta inválida", () => {
    const dashboard = mapDashboardResumen(null);

    expect(dashboard.resumenMorosidad.totalInmuebles).toBe(0);
    expect(dashboard.distritosStats).toEqual([]);
    expect(dashboard.ultimosMovimientos).toEqual([]);
    expect(isDashboardResumenEmpty(dashboard)).toBe(true);
  });
});
