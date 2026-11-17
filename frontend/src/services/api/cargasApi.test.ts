import { afterEach, describe, expect, it, vi } from "vitest";

import { cargasApi } from "@/services/api/cargasApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cargasApi incidencias", () => {
  it("envía filtros de resultado, código, usuario y fechas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      content: [],
      number: 0,
      size: 25,
      totalElements: 0,
      totalPages: 0,
    }));
    vi.stubGlobal("fetch", fetchMock);

    await cargasApi.incidencias("carga-1", {
      resultado: "CONFLICTO",
      codigo: "DATO_DISTINTO",
      usuario: "operador",
      desde: "2026-06-01T03:00:00.000Z",
      hasta: "2026-07-01T02:59:59.999Z",
      page: 0,
      size: 25,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:8081/api/v1/cargas/carga-1/errores"
      + "?resultado=CONFLICTO&codigo=DATO_DISTINTO&usuario=operador"
      + "&desde=2026-06-01T03%3A00%3A00.000Z&hasta=2026-07-01T02%3A59%3A59.999Z&page=0&size=25",
    );
  });
});

describe("cargasApi importación", () => {
  it.each([
    ["INMUEBLES", "/api/v1/cargas/inmuebles/excel", null],
    ["DEUDA", "/api/v1/cargas/deuda/excel", "2026-11-01"],
    ["FACTURACION_PAGOS", "/api/v1/cargas/facturacion-pagos/excel", null],
  ] as const)("conserva la carga de %s", async (tipo, endpoint, periodoEsperado) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "carga-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["cuenta\n123"], "carga.csv", { type: "text/csv" });
    await cargasApi.importar(tipo, file, "2026-11");
    expect(fetchMock.mock.calls[0][0]).toBe(`http://localhost:8081${endpoint}`);
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get("file")).toBe(file);
    expect(body.get("periodo")).toBe(periodoEsperado);
  });
});

it("revisa el archivo sin importarlo y envía solo las filas confirmadas", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(jsonResponse([{ fila: 2, periodo: "20/2023" }, { fila: 3, periodo: "25/2002" }]))
    .mockResolvedValueOnce(jsonResponse({ id: "carga-1" }));
  vi.stubGlobal("fetch", fetchMock);
  const file = new File(["ejemplo"], "facturas.xlsx");
  const candidatas = await cargasApi.revisarPeriodos(file);
  expect(candidatas).toHaveLength(2);
  expect(fetchMock.mock.calls[0][0]).toContain("/facturacion-pagos/revisar-periodos");
  await cargasApi.importar("FACTURACION_PAGOS", file, undefined, [3]);
  expect(fetchMock.mock.calls[1][1].body.get("filasCaudalimetro")).toBe("3");
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
