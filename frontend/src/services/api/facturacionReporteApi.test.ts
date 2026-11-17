import { afterEach, expect, it, vi } from "vitest";
import { facturacionReporteApi } from "./facturacionReporteApi";
afterEach(() => vi.unstubAllGlobals());
it("envía selección múltiple y conserva la selección vacía como ninguno", async () => {
  const fetchMock=vi.fn().mockResolvedValue(new Response("{}",{status:200,headers:{"Content-Type":"application/json"}}));
  vi.stubGlobal("fetch",fetchMock);
  await facturacionReporteApi.obtener({desde:"2026-11-01",hasta:"2026-11-30",grupoId:"",distritoId:"",conceptos:["NORMAL","PLAN"],cumplimiento:[]});
  const url=new URL(fetchMock.mock.calls[0][0]);
  expect(url.searchParams.get("conceptos")).toBe("NORMAL,PLAN");
  expect(url.searchParams.get("cumplimiento")).toBe("NINGUNO");
});
it("envía rango mensual y tipo sin parámetros de grupo vacíos", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({reporte:{},gruposDisponibles:[]}),{status:200,headers:{"Content-Type":"application/json"}}));
  vi.stubGlobal("fetch",fetchMock);
  await facturacionReporteApi.obtener({desde:"2026-10",hasta:"2026-12",grupoId:"",distritoId:"d1",tipo:"PLAN"});
  expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8081/api/v1/reportes/facturacion-recaudacion?desde=2026-10&hasta=2026-12&distritoId=d1&tipo=PLAN");
});
