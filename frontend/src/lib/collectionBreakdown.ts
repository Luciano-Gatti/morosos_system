import type { PagoReporte } from "@/services/api/facturacionReporteApi";
export const collectionCategories = [
  {key:"planes",label:"Planes de pago",color:"#6366f1"},
  {key:"vigentes",label:"Consumos · en término",color:"#0d9488"},
  {key:"vencidos",label:"Consumos · fuera de término",color:"#d97706"},
  {key:"otros",label:"Otros",color:"#64748b"},
  {key:"sinFecha",label:"Consumos · sin vencimiento",color:"#94a3b8"},
] as const;
export type CollectionBreakdown = Record<(typeof collectionCategories)[number]["key"],number>;
export const emptyBreakdown = (): CollectionBreakdown => ({planes:0,vigentes:0,vencidos:0,otros:0,sinFecha:0});
export function collectionBreakdown(pagos: PagoReporte[]) {
  const total=emptyBreakdown(); const months:Record<string,CollectionBreakdown>={};
  for(const p of pagos) {
    const key = p.tipo==="PLAN" ? "planes" : p.tipo!=="NORMAL" ? "otros" : p.cumplimiento==="EN_TERMINO" ? "vigentes" : p.cumplimiento==="FUERA_TERMINO" ? "vencidos" : "sinFecha";
    const month=p.fechaPago.slice(0,7); const amount=Math.round(p.importe*100);
    total[key]+=amount; (months[month]??=emptyBreakdown())[key]+=amount;
  }
  for(const values of [total,...Object.values(months)]) for(const key of Object.keys(values) as (keyof CollectionBreakdown)[]) values[key]/=100;
  return {total,months};
}
