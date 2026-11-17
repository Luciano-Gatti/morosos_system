import {describe,it,expect} from "vitest";
import {collectionBreakdown} from "./collectionBreakdown";
import type {PagoReporte} from "@/services/api/facturacionReporteApi";
const pago=(tipo:string,cumplimiento:PagoReporte["cumplimiento"],importe:number,fechaPago="2026-11-01"):PagoReporte=>({cuenta:"A",numero:"1",grupo:"R",tipo,cumplimiento,importe,fechaPago,fechaEmision:null,fechaVencimiento:null,diasAtraso:null});
describe("desglose de recaudación",()=>{
  it("separa tipos sin contar planes ni otros como conceptos vencidos",()=>{
    const result=collectionBreakdown([pago("PLAN","FUERA_TERMINO",100),pago("CAUDALIMETRO","EN_TERMINO",50),pago("NORMAL","EN_TERMINO",20),pago("NORMAL","FUERA_TERMINO",30),pago("NORMAL","SIN_FECHA",10)]);
    expect(result.total).toEqual({planes:100,otros:50,vigentes:20,vencidos:30,sinFecha:10});
    expect(Object.values(result.total).reduce((a,b)=>a+b,0)).toBe(210);
  });
  it("agrupa por el mes real del cobro y suma centavos",()=>{
    const r=collectionBreakdown([pago("NORMAL","EN_TERMINO",0.1),pago("NORMAL","EN_TERMINO",0.2),pago("PLAN","EN_TERMINO",5,"2026-12-01")]);
    expect(r.months["2026-11"].vigentes).toBe(0.3);
    expect(r.months["2026-11"].planes).toBe(0);
    expect(r.months["2026-12"].planes).toBe(5);
    expect(collectionBreakdown([]).total.vigentes).toBe(0);
  });
});
