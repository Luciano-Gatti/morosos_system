import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MovimientoDetalle, filtrosDetalle } from "./MovimientoDetalle";
import { facturacionReporteApi, type FiltrosFacturacion, type SeleccionMovimiento } from "@/services/api/facturacionReporteApi";
const filters:FiltrosFacturacion={desde:"2026-11-10",hasta:"2026-11-20",grupoId:"g",distritoId:"d",conceptos:["NORMAL","PLAN"],cumplimiento:["FUERA_TERMINO"]};
const selection:SeleccionMovimiento={mes:"2026-11",movimiento:"RECAUDACION",titulo:"Planes",esperado:550,conceptos:["PLAN"]};
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it("intersecta el importe elegido con los filtros aplicados",()=>{
  expect(filtrosDetalle(filters,selection)).toEqual({...filters,conceptos:["PLAN"]});
  expect(filtrosDetalle(filters,{...selection,conceptos:["OTROS"],cumplimiento:["EN_TERMINO"]})).toEqual({...filters,conceptos:[],cumplimiento:[]});
});
it("consulta el detalle, pagina, busca y vuelve conservando el reporte",async()=>{
  const rows=Array.from({length:55},(_,i)=>({cuenta:`A-${i}`,titular:`Titular ${i}`,numero:`F-${i}`,tipo:"PLAN",periodo:"/",grupo:"Residencial",fechaEmision:"2026-11-01",fechaVencimiento:"2026-11-09",fechaPago:"2026-11-10",neto:10,iva:0,descuento:0,importe:10,cumplimiento:"FUERA_TERMINO"}));
  const api=vi.spyOn(facturacionReporteApi,"detalle").mockResolvedValue({filas:rows,total:550,cuentas:55,sinImporte:0});const close=vi.fn();
  render(<MovimientoDetalle selection={selection} filters={filters} context="Grupo · Distrito" onClose={close}/>);
  await screen.findByText("55 registros · 55 cuentas distintas");
  expect(api).toHaveBeenCalledWith({...filters,conceptos:["PLAN"]},"2026-11","RECAUDACION");
  expect(screen.queryByText("F-54")).toBeNull();fireEvent.click(screen.getByRole("button",{name:"Siguiente"}));expect(screen.getByText("F-54")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox",{name:"Buscar cuenta, titular o factura"}),{target:{value:"F-12"}});
  await waitFor(()=>expect(screen.getByText("F-12")).toBeTruthy());expect(screen.queryByText("F-54")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:/Volver al reporte/}));expect(close).toHaveBeenCalledOnce();
});
