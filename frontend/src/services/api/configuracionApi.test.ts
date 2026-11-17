import { afterEach, describe, expect, it, vi } from "vitest";

import {
  configuracionApi,
  extractConfiguracionItems,
} from "@/services/api/configuracionApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("configuracionApi", () => {
  it("extrae elementos de respuestas planas y paginadas", () => {
    const rows = [{ id: "1" }];

    expect(extractConfiguracionItems(rows)).toEqual(rows);
    expect(extractConfiguracionItems({ content: rows })).toEqual(rows);
    expect(extractConfiguracionItems({ totalElements: 0 })).toEqual([]);
  });

  it("construye filtros de catálogos omitiendo valores vacíos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await configuracionApi.grupos({
      size: 500,
      activo: true,
      nombre: undefined,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:8081/api/v1/grupos?size=500&activo=true",
    );
  });

  it("envía cuerpos tipados para etapas e impacto", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "etapa-1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          hayImpacto: true,
          impactoCalculable: true,
          totalProcesosAbiertos: 10,
          procesosAfectados: 3,
          porcentajeImpacto: 30,
          mensaje: "Tres procesos afectados",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await configuracionApi.crearEtapa({
      codigo: "INTIMACION",
      nombre: "Intimación",
      descripcion: null,
      orden: 2,
      activo: true,
      esFinal: false,
    });
    const impacto = await configuracionApi.calcularImpactoParametrosSeguimiento({
      parametros: [
        {
          clave: "CUOTAS_PARA_MOROSO",
          valorAnterior: 3,
          valorNuevo: 4,
        },
      ],
    });

    const [, etapaInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [impactoUrl, impactoInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(etapaInit.method).toBe("POST");
    expect(JSON.parse(String(etapaInit.body))).toMatchObject({
      codigo: "INTIMACION",
      orden: 2,
      esFinal: false,
    });
    expect(impactoUrl).toBe(
      "http://localhost:8081/api/v1/parametros-seguimiento/impacto",
    );
    expect(JSON.parse(String(impactoInit.body))).toEqual({
      parametros: [
        {
          clave: "CUOTAS_PARA_MOROSO",
          valorAnterior: 3,
          valorNuevo: 4,
        },
      ],
    });
    expect(impacto.procesosAfectados).toBe(3);
  });

  it("usa DELETE para eliminar recursos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await configuracionApi.eliminarMotivoCierre("motivo-1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://localhost:8081/api/v1/motivos-cierre/motivo-1",
    );
    expect(init.method).toBe("DELETE");
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
