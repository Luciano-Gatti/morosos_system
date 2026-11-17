import type { PagoReporte, SeleccionMovimiento } from "@/services/api/facturacionReporteApi";
import { collectionBreakdown, collectionCategories, emptyBreakdown } from "@/lib/collectionBreakdown";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const compacto = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });
export function MonthlyMovementChart({ data, showBilling, pagos, onDetail }: {
  data: { mes: string; facturado: number | null; recaudado: number; facturadoNormal?: number | null; facturadoPlanes?: number | null; facturadoOtros?: number | null }[];
  showBilling: boolean;
  pagos: PagoReporte[];
  onDetail?: (selection: SeleccionMovimiento) => void;
}) {
  const breakdown=useMemo(()=>collectionBreakdown(pagos),[pagos]);
  const chartData=useMemo(()=>data.map(row=>{const [month,year]=row.mes.split("/");return {...row,desglose:breakdown.months[`${year}-${month}`]??emptyBreakdown()};}),[data,breakdown]);
  const [pinned,setPinned]=useState<string|null>(null);
  const pinnedRef=useRef<HTMLDivElement>(null);
  const dismissedClick=useRef(false);
  useEffect(()=>{
    function outside(event:PointerEvent) {
      const target=event.target;
      dismissedClick.current=false;
      if(!(target instanceof Element)||target.closest('[role="dialog"]'))return;
      if(pinned&&!pinnedRef.current?.contains(target)) {
        dismissedClick.current=true;
        setPinned(null);
      }
    }
    document.addEventListener("pointerdown",outside,true);
    return ()=>document.removeEventListener("pointerdown",outside,true);
  },[pinned]);
  const chartRef=useRef<HTMLDivElement>(null);
  const hoverRef=useRef<HTMLDivElement>(null);
  const [anchor,setAnchor]=useState({left:8,top:8,width:300});
  function pinMonth(month:string|null,fromHover=false) {
    if(month&&fromHover&&chartRef.current&&hoverRef.current) {
      const chart=chartRef.current.getBoundingClientRect();
      const tooltip=hoverRef.current.getBoundingClientRect();
      setAnchor({left:tooltip.left-chart.left,top:tooltip.top-chart.top,width:tooltip.width});
    } else if(!pinned) setAnchor({left:8,top:8,width:300});
    setPinned(month);
  }
  function amount(mes:string,movimiento:SeleccionMovimiento["movimiento"],titulo:string,value:number|null|undefined,conceptos?:string[],cumplimiento?:string[]) {
    const text=typeof value === "number"?pesos.format(value):"Sin datos completos";
    if(!onDetail)return <span>{text}</span>;
    const [month,year]=mes.split("/");
    return <button type="button" className="whitespace-nowrap rounded text-right font-medium underline decoration-dotted underline-offset-4 hover:text-primary focus-visible:outline focus-visible:outline-2" aria-label={`Ver ${titulo} de ${mes}`} onClick={e=>{e.stopPropagation();onDetail({mes:`${year}-${month}`,movimiento,titulo,esperado:value??null,conceptos,cumplimiento});}}>{text}</button>;
  }
  function information(row:(typeof chartData)[number]) {
            return <div ref={!pinned?hoverRef:undefined} className="max-w-[300px] rounded-xl border bg-surface p-3 text-xs shadow-lg"><div className="mb-3 flex justify-between gap-4"><p className="font-semibold">{row.mes}</p>{onDetail&&<button type="button" tabIndex={pinned?0:-1} aria-hidden={!pinned} className={`underline ${pinned?"":"invisible"}`} onClick={e=>{e.stopPropagation();setPinned(null);}}>Soltar cuadro</button>}</div>
              {showBilling && <div className="mb-2 flex justify-between gap-4"><span>Facturación</span>{amount(row.mes,"FACTURACION","Facturación",row.facturado)}</div>}
              {showBilling && <ul className="mb-3 space-y-1 border-b pb-2 text-muted-foreground">{[["Consumos",row.facturadoNormal],["Planes",row.facturadoPlanes],["Otros",row.facturadoOtros]].map(([label,value])=><li key={String(label)} className="flex justify-between gap-4"><span>{label}</span>{amount(row.mes,"FACTURACION",`Facturación · ${label}`,typeof value==="number"?value:null,[label==="Consumos"?"NORMAL":label==="Planes"?"PLAN":"OTROS"])}</li>)}</ul>}
              <div className="flex justify-between gap-4 text-teal-700"><span className="font-semibold">Recaudación</span>{amount(row.mes,"RECAUDACION","Recaudación",row.recaudado)}</div>
              <ul className="mt-2 space-y-2 border-t pt-2">{collectionCategories.filter(c=>c.key!=="sinFecha"||row.desglose.sinFecha>0).map(c=><li key={c.key} className="flex items-center justify-between gap-4"><span className="flex items-center gap-2"><span className="h-2 w-2 shrink-0 rounded-full" style={{background:c.color}}/>{c.label}</span>{amount(row.mes,"RECAUDACION",`Recaudación · ${c.label}`,row.desglose[c.key],[c.key==="planes"?"PLAN":c.key==="otros"?"OTROS":"NORMAL"],c.key==="vigentes"?["EN_TERMINO"]:c.key==="vencidos"?["FUERA_TERMINO"]:c.key==="sinFecha"?["SIN_FECHA"]:undefined)}</li>)}</ul>
            </div>;
  }
  const gradient = `billing-${useId().replace(/:/g, "")}`;
  return <>
    <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium" aria-label="Leyenda del gráfico">
      {showBilling && <span className="inline-flex items-center gap-2"><span className="h-4 w-3 rounded-sm border border-indigo-400 bg-indigo-200"/>Facturación · barras</span>}
      <span className="inline-flex items-center gap-2"><svg width="30" height="16" aria-hidden="true"><path d="M0 8H30" stroke="#0f766e" strokeWidth="3"/><circle cx="15" cy="8" r="4" fill="#0f766e" stroke="white" strokeWidth="2"/></svg>Recaudación · línea</span>
    </div>
    {onDetail&&<div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><label htmlFor={`${gradient}-month`}>Hacé clic en un mes para fijar el cuadro y abrir sus importes, o elegí:</label><select id={`${gradient}-month`} className="rounded border bg-background p-1" value={pinned??""} onChange={e=>pinMonth(e.target.value||null)}><option value="">Seleccionar mes</option>{data.map(r=><option key={r.mes} value={r.mes}>{r.mes}</option>)}</select></div>}
    <div ref={chartRef} className="relative mt-4 h-80 min-w-0 overflow-hidden sm:h-96" role="group" aria-label="Evolución mensual. Facturación en barras violetas suaves y recaudación en una línea verde con puntos. Valores exactos en el detalle mensual.">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart onClick={state=>{if(!dismissedClick.current&&onDetail&&state?.activeLabel)pinMonth(String(state.activeLabel),true);}} data={chartData} margin={{top:15,right:20,bottom:10,left:0}} barCategoryGap="35%">
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a5b4fc" stopOpacity={0.75}/><stop offset="100%" stopColor="#c7d2fe" stopOpacity={0.3}/></linearGradient></defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.7} strokeDasharray="3 5" vertical={false}/>
          <XAxis dataKey="mes" tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}} tickLine={false} axisLine={false} tickMargin={12} minTickGap={24}/>
          <YAxis tickFormatter={v=>`$${compacto.format(Number(v))}`} width={85} tick={{fontSize:11,fill:"hsl(var(--muted-foreground))"}} tickLine={false} axisLine={false}/>
          <Tooltip isAnimationActive={false} wrapperStyle={{pointerEvents:"none"}} cursor={{stroke:"hsl(var(--muted-foreground))",strokeDasharray:"4 4",strokeOpacity:0.4}} content={({active,payload})=>!pinned&&active&&payload?.[0]?.payload ? information(payload[0].payload) : null} />
          {showBilling && <Bar dataKey="facturado" name="Facturación seleccionada" fill={`url(#${gradient})`} stroke="#818cf8" strokeOpacity={0.65} radius={[5,5,0,0]} maxBarSize={34} />}
          {/* A surface-colored outline keeps the line visible when it crosses a bar. */}
          <Line type="linear" dataKey="recaudado" stroke="hsl(var(--surface))" strokeWidth={8} dot={false} activeDot={false} tooltipType="none" legendType="none" isAnimationActive={false}/>
          <Line type="linear" dataKey="recaudado" name="Recaudación" stroke="#0f766e" strokeWidth={3.5} strokeLinecap="round"
            dot={{r:4,fill:"#0f766e",stroke:"hsl(var(--surface))",strokeWidth:2}}
            activeDot={{r:6,fill:"#0f766e",stroke:"hsl(var(--surface))",strokeWidth:3}} isAnimationActive={false}/>
        </ComposedChart>
      </ResponsiveContainer>
      {pinned&&chartData.some(r=>r.mes===pinned)&&<div ref={pinnedRef} style={{left:anchor.left,top:anchor.top,width:anchor.width,maxHeight:`calc(100% - ${anchor.top}px)`}} className="absolute z-10 max-w-[calc(100%-1rem)] overflow-auto">{information(chartData.find(r=>r.mes===pinned)!)}</div>}
    </div>
    <div className="mb-4 border-t pt-4">
      <p className="mb-3 text-xs font-medium text-muted-foreground">Composición de la recaudación del rango seleccionado</p>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{collectionCategories.filter(c=>c.key!=="sinFecha"||breakdown.total.sinFecha>0).map(c=><li key={c.key}><p className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{background:c.color}}/>{c.label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{pesos.format(breakdown.total[c.key])}</p></li>)}</ul>
      <p className="mt-3 text-xs text-muted-foreground">Vigentes: consumos pagados hasta el vencimiento inclusive. Vencidos: consumos pagados después. Otros: caudalímetros, multas y demás cargos especiales.</p>
    </div>
  </>;
}
