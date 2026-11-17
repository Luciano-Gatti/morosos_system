import { afterEach, describe, expect, it, vi } from "vitest";

import { inmueblesApi } from "@/services/api/inmueblesApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("inmueblesApi", () => {
  it("envía filtros, orden y paginación al listado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [],
        number: 0,
        size: 12,
        totalElements: 0,
        totalPages: 0,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await inmueblesApi.list({
      page: 0,
      size: 12,
      q: "A-100",
      campo: "cuenta",
      grupoId: "grupo-1",
      distritoId: "distrito-1",
      activo: true,
      sort: "cuenta,asc",
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://localhost:8081/api/v1/inmuebles?page=0&size=12&q=A-100"
        + "&campo=cuenta&grupoId=grupo-1&distritoId=distrito-1"
        + "&activo=true&sort=cuenta%2Casc",
    );
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
