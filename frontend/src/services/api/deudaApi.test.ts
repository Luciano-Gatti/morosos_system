import { afterEach, describe, expect, it, vi } from "vitest";

import { deudaApi } from "@/services/api/deudaApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("deudaApi", () => {
  it("consulta detalles y errores con filtros paginados", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(emptyPage())
      .mockResolvedValueOnce(emptyPage());
    vi.stubGlobal("fetch", fetchMock);

    await deudaApi.getDetalles("carga-1", {
      page: 0,
      size: 12,
      search: "A-10",
      cuotasMin: 4,
      sort: "monto,desc",
    });
    await deudaApi.getErrores("carga-1", {
      page: 1,
      size: 12,
      search: "inexistente",
      sort: "fila,asc",
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:8081/api/v1/deuda/cargas/carga-1/detalles"
        + "?page=0&size=12&search=A-10&cuotasMin=4&sort=monto%2Cdesc",
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://localhost:8081/api/v1/deuda/cargas/carga-1/errores"
        + "?page=1&size=12&search=inexistente&sort=fila%2Casc",
    );
  });
});

function emptyPage() {
  return new Response(
    JSON.stringify({
      content: [],
      number: 0,
      size: 12,
      totalElements: 0,
      totalPages: 0,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
