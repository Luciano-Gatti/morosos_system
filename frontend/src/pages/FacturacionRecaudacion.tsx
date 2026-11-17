import { MovimientoDetalle } from "@/components/reportes/MovimientoDetalle";
import type { SeleccionMovimiento } from "@/services/api/facturacionReporteApi";
import { ReportMultiFilter, conceptOptions, paymentOptions } from "@/components/reportes/ReportMultiFilter";
import { PaymentTimeliness } from "@/components/reportes/PaymentTimeliness";
import { MonthlyMovementChart } from "@/components/reportes/MonthlyMovementChart";
import { ReportKpi as Kpi } from "@/components/reportes/ReportKpi";
import { useEffect, useState } from "react";
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart } from "recharts";
import { reportDateRange, type ReportRange } from "@/lib/reportDateRanges";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { facturacionReporteApi, type FiltrosFacturacion, type ReporteFacturacion } from "@/services/api/facturacionReporteApi";

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const cantidad = new Intl.NumberFormat("es-AR");
const compacto = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });
const importe = (n: number | null) => n === null ? "Sin datos completos" : pesos.format(n);
const mesLabel = (s: string) => { const [y,m] = s.split("-"); return `${m}/${y}`; };
function inicial(): FiltrosFacturacion {
  return { ...reportDateRange("6m"), grupoId: "", distritoId: "", conceptos: conceptOptions.map(o=>o.value), cumplimiento: paymentOptions.map(o=>o.value) };
}
export default function FacturacionRecaudacion() {
  const [detalle,setDetalle]=useState<SeleccionMovimiento|null>(null);
  const [range,setRange] = useState<ReportRange>("6m");
  const [filters,setFilters] = useState<FiltrosFacturacion>(inicial);
  const [applied,setApplied] = useState<FiltrosFacturacion>(filters);
  const [data,setData] = useState<ReporteFacturacion | null>(null);
  const [districts,setDistricts] = useState<ReporteFacturacion["distritosDisponibles"]>([]);
  const [groups,setGroups] = useState<ReporteFacturacion["gruposDisponibles"]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  useEffect(() => {
    let active = true; setLoading(true); setError(""); setData(null);
    facturacionReporteApi.obtener(applied).then(result => { if(active) {setData(result);setGroups(result.gruposDisponibles);setDistricts(result.distritosDisponibles);} })
      .catch(e => {if(active) setError(e instanceof Error ? e.message : "No se pudo cargar el reporte.");})
      .finally(() => {if(active) setLoading(false);});
    return () => {active = false;};
  },[applied]);
  const report = data?.reporte, total = report?.totales;
  const sinMesEmision = false; // El filtro de conceptos afecta solo a la recaudación.
  const series = report?.meses.map(m => ({ mes: mesLabel(m.mes), facturadoNormal: m.indicadores.facturadoNormal, facturadoPlanes: m.indicadores.facturadoPlanes, facturadoOtros: m.indicadores.facturadoOtros, facturado: sinMesEmision ? null : m.indicadores.facturado, recaudado: m.indicadores.recaudado })) ?? [];
  const daily = (report?.dias?.length ?? 0) > 0;
  const trends = daily ? report?.dias ?? [] : report?.meses ?? [];
  const collectionSeries = trends.map(m => ({ fecha: daily ? dateLabel(m.mes) : mesLabel(m.mes), recaudado: m.indicadores.recaudado }));
  const groupSeries = [...(report?.grupos ?? [])].sort((a,b)=>b.indicadores.recaudado-a.indicadores.recaudado).map(g=>({nombre:g.nombre, facturado:sinMesEmision ? null : g.indicadores.facturado, recaudado:g.indicadores.recaudado}));
  const mix = total ? [{name:"Consumos",value:total.recaudadoNormal,color:"#0d9488"},{name:"Planes de pago",value:total.recaudadoPlanes,color:"#6366f1"},{name:"Otros",value:total.recaudadoCaudalimetros,color:"#f59e0b"}] : [];
  const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
  return <>
    <AppHeader title="Facturación y recaudación" description="Una mirada al movimiento de la facturación y los cobros." breadcrumb={[{label:"Reportes"},{label:"Facturación y recaudación"}]} />
    <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-6 sm:px-8">
      <form className="grid gap-x-3 gap-y-3 rounded-2xl border bg-surface p-3 shadow-sm sm:grid-cols-2 sm:p-4 md:grid-cols-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]" onSubmit={e => {
        e.preventDefault(); if(!filters.desde || !filters.hasta || (filters.desde !== "INICIO" && filters.desde > filters.hasta)) {setError("Seleccioná un rango de fechas válido.");return;} setApplied({...filters});
      }}>
        <div className="flex flex-wrap items-center gap-2 col-span-full" aria-label="Períodos rápidos">
          {([["7d","Últimos 7 días"],["1m","Último mes"],["6m","Últimos 6 meses"],["1y","Último año"],["all","Desde el inicio"],["custom","Personalizado"]] as [ReportRange,string][]).map(([key,label])=><Button key={key} type="button" size="sm" variant={range===key ? "default" : "outline"} className="h-8 rounded-full px-3 text-xs" onClick={()=>{setRange(key);if(key!=="custom") setFilters({...filters,...reportDateRange(key)});else if(filters.desde==="INICIO") setFilters({...filters,desde:report?.desde ?? reportDateRange("6m").desde});}}>{label}</Button>)}
          <Button className="ml-auto h-8 px-4 text-xs" disabled={loading}>{loading ? "Consultando…" : "Aplicar filtros"}</Button>
        </div>
        <div className="min-w-0 space-y-1"><Label htmlFor="desde">Desde</Label>{range==="all" ? <Input className="h-9 min-w-0 px-2 text-sm" id="desde" value="Primer movimiento disponible" disabled /> : <Input className="h-9 min-w-0 px-2 text-sm" id="desde" type="date" required value={filters.desde} onChange={e=>{setRange("custom");setFilters({...filters,desde:e.target.value});}} />}</div>
        <div className="min-w-0 space-y-1"><Label htmlFor="hasta">Hasta (inclusive)</Label><Input className="h-9 min-w-0 px-2 text-sm" id="hasta" type="date" required value={filters.hasta} onChange={e=>{setRange("custom");setFilters({...filters,desde:filters.desde==="INICIO" ? report?.desde ?? reportDateRange("6m").desde : filters.desde,hasta:e.target.value});}} /></div>
        <div className="min-w-0 space-y-1"><Label htmlFor="grupo">Grupo</Label><select id="grupo" className={selectClass} value={filters.grupoId} onChange={e=>setFilters({...filters,grupoId:e.target.value})}><option value="">Todos los grupos</option>{groups.map(g=><option key={g.id} value={g.id}>{g.nombre}</option>)}</select></div>
        <div className="min-w-0 space-y-1"><Label htmlFor="distrito">Distrito</Label>
          <select id="distrito" className={selectClass} value={filters.distritoId} onChange={e=>setFilters({...filters,distritoId:e.target.value})}>
            <option value="">Todos los distritos</option>
            {districts.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
          <ReportMultiFilter label="Conceptos" description="Se aplican a facturación y recaudación" options={conceptOptions} selected={filters.conceptos ?? []} onChange={conceptos=>setFilters({...filters,conceptos})} />
          <ReportMultiFilter label="Pagos" description="Se aplica solo a recaudación, para todos los tipos" options={paymentOptions} selected={filters.cumplimiento ?? []} onChange={cumplimiento=>setFilters({...filters,cumplimiento})} />
      </form>
      {error && <p role="alert" className="rounded-md border border-destructive p-3 text-destructive">{error}</p>}
      {loading && <p role="status">Cargando indicadores…</p>}
      {total && <>
        <p className="text-sm text-muted-foreground">{dateLabel(report!.desde)} al {dateLabel(report!.hasta)} · {groups.find(g=>g.id===applied.grupoId)?.nombre ?? "Todos los grupos"} · {districts.find(d=>d.id===applied.distritoId)?.nombre ?? "Todos los distritos"} · {conceptOptions.filter(o=>applied.conceptos?.includes(o.value)).map(o=>o.label).join(" · ") || "Sin tipos seleccionados"} · {paymentOptions.filter(o=>applied.cumplimiento?.includes(o.value)).map(o=>o.label).join(" · ") || "Sin pagos seleccionados"}</p>
        <p className="text-xs text-muted-foreground">El cumplimiento filtra únicamente los pagos. Los planes se muestran separados: pueden refinanciar consumos ya facturados; el total combinado no representa nueva deuda.</p>
        {total.conceptosSinImporte > 0 && <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Faltan los importes de facturación de {cantidad.format(total.conceptosSinImporte)} conceptos. Volvé a cargar el Excel con Importe Neto, IVA e Importe Descuentos. Los meses incompletos no muestran barra ni total de facturación; la recaudación sigue disponible.</div>}
        {total.conceptosEmitidos===0 && total.conceptosPagados===0 && <p className="rounded-md border p-4">No hay emisiones ni pagos para estos filtros. Revisá el rango o cargá el Excel.</p>}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi title="Facturación seleccionada" value={sinMesEmision ? "No aplica" : importe(total.facturado)} detail={`${cantidad.format(total.conceptosEmitidos)} conceptos emitidos`} trend={sinMesEmision ? [] : (report?.meses ?? []).map(m=>({date:mesLabel(m.mes),value:m.indicadores.facturado}))} color="#6366f1" formatValue={importe} />
          <Kpi title="Recaudación efectiva" value={importe(total.recaudado)} detail="Según fecha real de pago" trend={trends.map(m=>({date:daily ? dateLabel(m.mes) : mesLabel(m.mes),value:m.indicadores.recaudado}))} color="#0d9488" formatValue={importe} />
          <Kpi title="Conceptos pagados" value={cantidad.format(total.conceptosPagados)} detail="Facturas con cobro efectivo" trend={trends.map(m=>({date:daily ? dateLabel(m.mes) : mesLabel(m.mes),value:m.indicadores.conceptosPagados}))} color="#0284c7" formatValue={(n)=>n===null ? "Sin datos" : cantidad.format(n)} />
          <Kpi title="Cuentas que pagaron" value={cantidad.format(total.cuentasPagaron)} detail="Cuentas distintas en todo el rango" trend={trends.map(m=>({date:daily ? dateLabel(m.mes) : mesLabel(m.mes),value:m.indicadores.cuentasPagaron}))} color="#8b5cf6" formatValue={(n)=>n===null ? "Sin datos" : cantidad.format(n)} />
        </section>
        <section className="rounded-2xl border bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold">Evolución mensual</h2>
          <p className="mt-1 text-sm text-muted-foreground">{sinMesEmision ? "Cobros dentro de las fechas seleccionadas, agrupados por mes." : "Consumos por período + un mes; planes y otros por emisión. Cobros por fecha real de pago."}</p>
          <MonthlyMovementChart key={JSON.stringify(applied)} onDetail={setDetalle} data={series} showBilling={!sinMesEmision} pagos={report?.pagos ?? []} />
          <p className="text-xs text-muted-foreground">La facturación de consumos se asigna al mes siguiente al período (06/2025 → 07/2025), independientemente de la fecha real de emisión. Se incluyen completos los meses del rango; los cobros sí se filtran por día. Planes y otros usan su fecha real de emisión; sin esa fecha no se asignan a un mes de facturación. Las fechas reales se conservan para el análisis de pagos.</p>
        </section>
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Facturación por tipo">
          <Kpi title="Consumos facturados" value={importe(total.facturadoNormal)} detail="Período + un mes" />
          <Kpi title="Planes emitidos" value={importe(total.facturadoPlanes)} detail="Por fecha de emisión · refinanciaciones" />
          <Kpi title="Otros emitidos" value={importe(total.facturadoOtros)} detail="Por fecha de emisión · caudalímetros, multas, etc." />
        </section>
        <PaymentTimeliness key={JSON.stringify(applied)} pagos={report?.pagos ?? []} />
        {daily && <section className="rounded-2xl border bg-surface p-5 shadow-sm">
          <h2 className="font-semibold">Recaudación día a día</h2><p className="mt-1 text-sm text-muted-foreground">Cobros efectivos en el rango, incluidos los días sin movimientos.</p>
          <div className="mt-5 h-56" role="img" aria-label="Evolución diaria de la recaudación. Valores en Ver detalle diario."><ResponsiveContainer width="100%" height="100%"><AreaChart data={collectionSeries} margin={{left:10,right:15}}><defs><linearGradient id="cobrosFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d9488" stopOpacity={0.25}/><stop offset="100%" stopColor="#0d9488" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3"/><XAxis dataKey="fecha" tick={{fontSize:11}} minTickGap={35}/><YAxis width={80} tickFormatter={v=>`$${compacto.format(v)}`} tick={{fontSize:11}}/><Tooltip formatter={(v:number)=>importe(v)}/><Area type="linear" dataKey="recaudado" name="Recaudación" stroke="#0d9488" strokeWidth={2} fill="url(#cobrosFill)"/></AreaChart></ResponsiveContainer></div>
          <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">Ver detalle diario</summary><Table><TableHeader><TableRow><TableHead>Día</TableHead><TableHead>Recaudación</TableHead><TableHead>Conceptos pagados</TableHead><TableHead>Cuentas</TableHead></TableRow></TableHeader><TableBody>{report?.dias.map(d=><TableRow key={d.mes}><TableCell>{dateLabel(d.mes)}</TableCell><TableCell>{importe(d.indicadores.recaudado)}</TableCell><TableCell>{cantidad.format(d.indicadores.conceptosPagados)}</TableCell><TableCell>{cantidad.format(d.indicadores.cuentasPagaron)}</TableCell></TableRow>)}</TableBody></Table></details>
        </section>}
        <section className="grid gap-5 xl:grid-cols-3">
          <div className="min-w-0 rounded-2xl border bg-surface p-5 shadow-sm xl:col-span-2"><h2 className="font-semibold">Comparación por grupo</h2><p className="mt-1 text-sm text-muted-foreground">Importes por grupo actual del inmueble, ordenados por recaudación.</p>
            {groupSeries.length ? <div className="mt-5 overflow-y-auto" style={{maxHeight:420}}><div style={{height:Math.max(240,groupSeries.length*65)}} role="img" aria-label="Barras por grupo. Valores en Ver detalle por grupo."><ResponsiveContainer width="100%" height="100%"><BarChart data={groupSeries} layout="vertical" margin={{left:0,right:20}}><CartesianGrid horizontal={false} strokeDasharray="3 3"/><XAxis type="number" tickFormatter={v=>`$${compacto.format(v)}`} tick={{fontSize:11}}/><YAxis type="category" dataKey="nombre" width={105} tick={{fontSize:11}} tickFormatter={(v:string)=>v.length>16 ? `${v.slice(0,15)}…` : v}/><Tooltip formatter={(v:number)=>importe(v)}/><Legend/>{!sinMesEmision && <Bar dataKey="facturado" name="Facturación seleccionada" fill="#6366f1" radius={[0,4,4,0]} maxBarSize={16}/>}<Bar dataKey="recaudado" name="Recaudación" fill="#0d9488" radius={[0,4,4,0]} maxBarSize={16}/></BarChart></ResponsiveContainer></div></div> : <p className="py-16 text-center text-sm text-muted-foreground">Sin movimientos para comparar.</p>}
          </div>
          <div className="min-w-0 rounded-2xl border bg-surface p-5 shadow-sm"><h2 className="font-semibold">Composición de los cobros</h2><p className="mt-1 text-sm text-muted-foreground">Participación en la recaudación total.</p>
            {total.recaudado > 0 ? <div className="relative h-56" role="img" aria-label="Distribución de recaudación entre consumos, planes y caudalímetros."><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={mix.filter(m=>m.value>0)} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="85%" paddingAngle={3} stroke="none">{mix.filter(m=>m.value>0).map(m=><Cell key={m.name} fill={m.color}/>)}</Pie><Tooltip formatter={(v:number)=>importe(v)}/></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-xs text-muted-foreground">Recaudación</span><span className="text-xl font-semibold">${compacto.format(total.recaudado)}</span></div></div> : <p className="py-16 text-center text-sm text-muted-foreground">Sin cobros en el rango.</p>}
            <ul className="space-y-4">{mix.map(m=><li key={m.name} className="text-sm"><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{background:m.color}}/>{m.name}</span><span className="font-medium">{total.recaudado ? cantidad.format(Math.round(m.value/total.recaudado*1000)/10) : 0}%</span></div><p className="ml-4 mt-1 text-xs text-muted-foreground">{importe(m.value)}</p></li>)}</ul>
          </div>
        </section>
        {!sinMesEmision && <details className="space-y-3 rounded-2xl border bg-surface p-5">
          <summary className="cursor-pointer font-semibold">Descuentos en la emisión · {importe(total.descuentosDocumentados)}{total.descuentosARevisar > 0 && <span className="ml-2 text-xs text-amber-700">{cantidad.format(total.descuentosARevisar)} por verificar</span>}</summary>
          <p className="text-sm text-muted-foreground">Jubilados, discapacidad y tarifa social aplican a cada emisión mientras la factura está vigente. Los importes documentados se conservan después del vencimiento. Cuando la factura omite el tipo, se consulta el beneficio de la cuenta.</p>
          <p className="text-sm">Total documentado en el rango: <strong>{importe(total.descuentosDocumentados)}</strong></p>
          {Object.keys(total.descuentosPorBeneficio).length > 0 ? <Table>
            <TableHeader><TableRow><TableHead>Beneficio</TableHead><TableHead>Conceptos con importe</TableHead><TableHead>Importe documentado</TableHead><TableHead>Conceptos por verificar</TableHead></TableRow></TableHeader>
            <TableBody>{Object.entries(total.descuentosPorBeneficio).sort(([a],[b]) => a.localeCompare(b)).map(([nombre, d]) =>
              <TableRow key={nombre}><TableCell>{nombre === "Sin clasificar" ? "Tipo pendiente de identificar" : nombre}</TableCell><TableCell>{cantidad.format(d.conceptos)}</TableCell><TableCell>{d.conceptos ? importe(d.importe) : "Pendiente"}</TableCell><TableCell>{cantidad.format(d.sinImporte)}</TableCell></TableRow>)}</TableBody>
          </Table> : <p className="text-sm text-muted-foreground">Las cargas del rango todavía no informan descuentos con importe positivo.</p>}
          {total.descuentosARevisar > 0 && <p className="text-sm text-amber-800">{cantidad.format(total.descuentosARevisar)} conceptos requieren verificar el descuento en la factura original. Hay un beneficio informado sin importe o un cobro inferior al facturado. La facturación usa los importes documentados hasta completar esa información.</p>}
        </details>}
        <details className="rounded-2xl border bg-surface p-5"><summary className="cursor-pointer font-semibold">Ver cantidades por tipo de concepto</summary><section className="mt-4 grid gap-3 md:grid-cols-3">
          <Kpi title="Recaudación de consumos" value={importe(total.recaudadoNormal)} detail={`${cantidad.format(total.conceptosNormalesPagados)} conceptos · ${cantidad.format(total.cuentasNormales)} cuentas`} />
          <Kpi title="Recaudación de otros" value={importe(total.recaudadoCaudalimetros)} detail={`${cantidad.format(total.conceptosCaudalimetroPagados)} cuotas · ${cantidad.format(total.cuentasCaudalimetros)} cuentas`} />
          <Kpi title="Recaudación de planes de pago" value={importe(total.recaudadoPlanes)} detail={`${cantidad.format(total.conceptosPlanPagados)} conceptos · ${cantidad.format(total.cuentasPlanes)} cuentas`} />
        </section></details>
        <p className="text-xs text-muted-foreground">Una cuenta que paga distintos tipos de conceptos cuenta una sola vez en el total. Se excluyen cuentas de prueba y se utiliza el grupo actual del inmueble.</p>
        <details className="rounded-2xl border bg-surface p-5"><summary className="cursor-pointer font-semibold">Ver detalle por grupo</summary><div className="overflow-x-auto"><Table><TableHeader><TableRow>{["Grupo","Facturación seleccionada","Consumos emitidos","Planes emitidos","Otros emitidos","Descuento documentado","Recaudación de consumos","Recaudación planes","Otros","Recaudación total","Conceptos pagados","Cuentas"].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>
          {report?.grupos.map(g=><TableRow key={g.id}><TableCell>{g.nombre}</TableCell><TableCell>{sinMesEmision ? "—" : importe(g.indicadores.facturado)}</TableCell><TableCell>{importe(g.indicadores.facturadoNormal)}</TableCell><TableCell>{importe(g.indicadores.facturadoPlanes)}</TableCell><TableCell>{importe(g.indicadores.facturadoOtros)}</TableCell><TableCell>{importe(g.indicadores.descuentosDocumentados)}</TableCell><TableCell>{importe(g.indicadores.recaudadoNormal)}</TableCell><TableCell>{importe(g.indicadores.recaudadoPlanes)}</TableCell><TableCell>{importe(g.indicadores.recaudadoCaudalimetros)}</TableCell><TableCell>{importe(g.indicadores.recaudado)}</TableCell><TableCell>{cantidad.format(g.indicadores.conceptosPagados)}</TableCell><TableCell>{cantidad.format(g.indicadores.cuentasPagaron)}</TableCell></TableRow>)}
          {!report?.grupos.length && <TableRow><TableCell colSpan={12}>Sin datos para estos filtros.</TableCell></TableRow>}
        </TableBody></Table></div></details>
        <details className="rounded-2xl border bg-surface p-5"><summary className="cursor-pointer font-semibold">Ver detalle mensual</summary><div className="overflow-x-auto"><Table><TableHeader><TableRow>{["Mes","Facturación seleccionada","Consumos emitidos","Planes emitidos","Otros emitidos","Descuento documentado","Recaudación de consumos","Recaudación planes","Otros","Recaudación total","Conceptos pagados","Cuentas"].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>
          {report?.meses.map(m=><TableRow key={m.mes}><TableCell>{mesLabel(m.mes)}</TableCell><TableCell>{sinMesEmision ? "—" : importe(m.indicadores.facturado)}</TableCell><TableCell>{importe(m.indicadores.facturadoNormal)}</TableCell><TableCell>{importe(m.indicadores.facturadoPlanes)}</TableCell><TableCell>{importe(m.indicadores.facturadoOtros)}</TableCell><TableCell>{importe(m.indicadores.descuentosDocumentados)}</TableCell><TableCell>{importe(m.indicadores.recaudadoNormal)}</TableCell><TableCell>{importe(m.indicadores.recaudadoPlanes)}</TableCell><TableCell>{importe(m.indicadores.recaudadoCaudalimetros)}</TableCell><TableCell>{importe(m.indicadores.recaudado)}</TableCell><TableCell>{cantidad.format(m.indicadores.conceptosPagados)}</TableCell><TableCell>{cantidad.format(m.indicadores.cuentasPagaron)}</TableCell></TableRow>)}
        </TableBody></Table></div><p className="mt-3 text-xs text-muted-foreground">Cada cuenta aparece una vez en cada mes que pagó y una sola vez en el total del rango.</p></details>
      </>}
    </main>
    {detalle&&<MovimientoDetalle selection={detalle} filters={applied} context={`${groups.find(g=>g.id===applied.grupoId)?.nombre??"Todos los grupos"} · ${districts.find(d=>d.id===applied.distritoId)?.nombre??"Todos los distritos"}`} onClose={()=>setDetalle(null)} />}
  </>;
}
function dateLabel(value:string) { return value.split("-").reverse().join("/"); }
