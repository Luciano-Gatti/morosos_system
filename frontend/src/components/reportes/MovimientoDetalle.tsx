import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { facturacionReporteApi, type DetalleMovimiento, type FiltrosFacturacion, type SeleccionMovimiento } from "@/services/api/facturacionReporteApi";

const money=(n:number|null)=>n===null?"Sin importe":new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(n);
const date=(s:string|null)=>s?s.split("-").reverse().join("/"):"—";
const types:Record<string,string>={NORMAL:"Consumos",PLAN:"Plan de pago",OTROS:"Otros"};
const timing:Record<string,string>={EN_TERMINO:"En término",FUERA_TERMINO:"Fuera de término",SIN_FECHA:"Sin vencimiento informado"};
export function filtrosDetalle(filters:FiltrosFacturacion,selection:SeleccionMovimiento):FiltrosFacturacion {
  return {...filters,conceptos:(filters.conceptos??[]).filter(v=>!selection.conceptos||selection.conceptos.includes(v)),
    cumplimiento:(filters.cumplimiento??[]).filter(v=>!selection.cumplimiento||selection.cumplimiento.includes(v))};
}
export function MovimientoDetalle({selection,filters,context,onClose}:{selection:SeleccionMovimiento;filters:FiltrosFacturacion;context:string;onClose:()=>void}) {
  const [data,setData]=useState<DetalleMovimiento|null>(null),[error,setError]=useState(""),[search,setSearch]=useState(""),[page,setPage]=useState(0),[exporting,setExporting]=useState(false);
  const selected=useMemo(()=>filtrosDetalle(filters,selection),[filters,selection]);
  useEffect(()=>{let active=true;setData(null);setError("");
    facturacionReporteApi.detalle(selected,selection.mes,selection.movimiento).then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"No se pudo consultar el detalle.");});
    return ()=>{active=false;};
  },[selected,selection]);
  const billing=selection.movimiento==="FACTURACION";
  const rows=useMemo(()=>data?.filas.filter(r=>[r.cuenta,r.titular,r.numero].some(v=>v?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())))??[],[data,search]);
  const pages=Math.max(1,Math.ceil(rows.length/50));
  const subtotal=rows.some(r=>r.importe===null)?null:rows.reduce((sum,r)=>sum+Math.round((r.importe??0)*100),0)/100;
  async function exportExcel() {
    setExporting(true);
    try {
      const XLSX=await import("xlsx");const wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
        [selection.titulo,selection.mes],["Filtros",context],["Rango",filters.desde,filters.hasta],
        ["Conceptos",selected.conceptos?.map(t=>types[t]).join(", ")],["Pagos",billing?"No aplica":selected.cumplimiento?.join(",")],
        ["Total del detalle",data?.total??null],["Búsqueda",search],["Registros exportados",rows.length],["Subtotal exportado",subtotal]
      ]),"Resumen");
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.map(r=>({Cuenta:r.cuenta,Titular:r.titular,Factura:r.numero,Tipo:types[r.tipo],"Período / código":r.periodo,Grupo:r.grupo,
        Emisión:r.fechaEmision,Vencimiento:r.fechaVencimiento,...(billing?{Neto:r.neto,IVA:r.iva,Descuentos:r.descuento}: {"Fecha de pago":r.fechaPago,Cumplimiento:timing[r.cumplimiento]}),
        [billing?"Importe facturado":"Importe pagado"]:r.importe}))),"Movimientos");
      XLSX.writeFile(wb,`${selection.movimiento.toLowerCase()}-${selection.mes}.xlsx`);
    } catch {setError("No se pudo exportar el Excel. Intentá nuevamente.");} finally {setExporting(false);}
  }
  return <Dialog open onOpenChange={open=>{if(!open)onClose();}}><DialogContent className="flex h-[92vh] max-h-[92vh] max-w-[1500px] flex-col overflow-hidden">
    <div className="shrink-0 space-y-2 pr-6">
      <Button variant="ghost" size="sm" onClick={onClose}>← Volver al reporte</Button>
      <DialogTitle>{selection.titulo} · {selection.mes.split("-").reverse().join("/")}</DialogTitle>
      <DialogDescription>{context} · Rango: {date(filters.desde)} al {date(filters.hasta)}. {billing?"Facturación normal por período + un mes; planes y otros por emisión.":"Cobros por fecha real de pago."}</DialogDescription>
      <p className="text-xs text-muted-foreground">Conceptos: {selected.conceptos?.map(t=>types[t]).join(", ")||"Ninguno"}{!billing&&` · Pagos: ${selected.cumplimiento?.map(t=>timing[t]).join(", ")||"Ninguno"}`}</p>
    </div>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    {!data&&!error&&<p role="status">Consultando movimientos…</p>}
    {data&&<>
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 rounded-lg bg-muted/40 p-3">
        <div><p className="text-xs text-muted-foreground">Total del detalle</p><p className="text-xl font-semibold">{money(data.total)}</p><p className="text-xs">{data.filas.length} registros · {data.cuentas} cuentas distintas</p></div>
        <div className="flex flex-wrap gap-2"><Input aria-label="Buscar cuenta, titular o factura" placeholder="Cuenta, titular o factura…" className="w-64 max-w-full" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/><Button variant="outline" disabled={exporting||!rows.length} onClick={exportExcel}>{exporting?"Exportando…":"Exportar Excel"}</Button></div>
      </div>
      {data.sinImporte>0&&<p className="text-sm text-amber-700">{data.sinImporte} registros sin importe completo; no se calcula un total parcial.</p>}
      {data.total!==null&&selection.esperado!==null&&Math.round(data.total*100)!==Math.round(selection.esperado*100)&&<p role="status" className="text-sm text-amber-700">El detalle difiere del importe del gráfico ({money(selection.esperado)}). Los datos pueden haber cambiado; volvé al reporte y aplicá los filtros para actualizarlo.</p>}
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <Table><TableHeader><TableRow>{["Cuenta","Titular","Factura","Tipo","Período / código","Grupo","Emisión","Vencimiento",...(billing?["Neto","IVA","Descuentos"]:["Fecha de pago","Cumplimiento"]),billing?"Facturado":"Pagado"].map(h=><TableHead className="whitespace-nowrap" key={h}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.slice(page*50,(page+1)*50).map((r,i)=><TableRow key={`${r.cuenta}-${r.numero}-${i}`}>
          <TableCell className="whitespace-nowrap font-mono">{r.cuenta}</TableCell><TableCell>{r.titular}</TableCell><TableCell className="whitespace-nowrap">{r.numero}</TableCell><TableCell>{types[r.tipo]}</TableCell><TableCell>{r.periodo}</TableCell><TableCell>{r.grupo}</TableCell><TableCell>{date(r.fechaEmision)}</TableCell><TableCell>{date(r.fechaVencimiento)}</TableCell>
          {billing?<><TableCell>{money(r.neto)}</TableCell><TableCell>{money(r.iva)}</TableCell><TableCell>{money(r.descuento)}</TableCell></>:<><TableCell>{date(r.fechaPago)}</TableCell><TableCell>{timing[r.cumplimiento]}</TableCell></>}
          <TableCell className="whitespace-nowrap text-right font-medium">{money(r.importe)}</TableCell>
        </TableRow>)}{!rows.length&&<TableRow><TableCell colSpan={12} className="py-8 text-center">No hay movimientos para esta selección.</TableCell></TableRow>}</TableBody></Table>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm"><span>{rows.length} registros{search&&` · Subtotal de búsqueda: ${money(subtotal)}`}</span><div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={!page} onClick={()=>setPage(p=>p-1)}>Anterior</Button><span>{page+1} / {pages}</span><Button variant="outline" size="sm" disabled={page+1>=pages} onClick={()=>setPage(p=>p+1)}>Siguiente</Button></div></div>
    </>}
  </DialogContent></Dialog>;
}
