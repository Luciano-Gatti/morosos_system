import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CargaProceso } from "@/types/cargas";
import type { SpringPage } from "@/types/pagination";

interface Campo { campo: string; anterior: string | null; informado: string | null; vigente: string | null }
interface Cambio { fila: number; cuenta: string; numero: string; resultado: string; motivo: string | null; campos: Campo[] }
const etiquetas: Record<string,string> = { ACTUALIZADA: "Actualizada", CONSERVADA: "Se conservó el registro anterior", CONFLICTO: "Conflicto, se conservó el registro anterior" };
const importes = new Set(["Importe a cobrar","Importe neto","IVA","Descuento","Importe facturado"]);
const pesos = new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"});
function mostrar(campo: string, valor: string | null) {
  if (valor == null) return "Sin dato";
  return importes.has(campo) ? pesos.format(Number(valor)) : valor;
}
export function CambiosFactura({ carga }: { carga: CargaProceso }) {
  const [page,setPage] = useState(0);
  const [data,setData] = useState<SpringPage<Cambio> | null>(null);
  const [error,setError] = useState("");
  const cantidad = carga.facturasConDiferencias;
  useEffect(() => {
    if (!cantidad) return;
    let active = true;
    setData(null); setError("");
    apiClient.get<SpringPage<Cambio>>(`/api/v1/cargas/${carga.id}/facturas/cambios?page=${page}&size=15`)
      .then(result => { if (active) setData(result); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "No se pudo leer la comparación."); });
    return () => { active = false; };
  },[carga.id,cantidad,page]);
  if (cantidad == null) return <p className="text-sm text-muted-foreground">Esta carga no tiene una comparación registrada.</p>;
  return <section className="space-y-3 rounded-md border bg-surface p-4">
    <h2 className="font-semibold">Comparación con las facturas registradas</h2>
    <p className="text-sm">{carga.creados} nuevas · <strong>{cantidad} repetidas con diferencias</strong> · {carga.facturasRepetidasIguales} repetidas iguales</p>
    {error && <p role="alert">{error}</p>}
    {cantidad > 0 && !data && !error && <p>Cargando diferencias…</p>}
    {data?.content.map(f => <article key={f.fila} className="rounded-md border p-3">
      <h3 className="text-sm font-semibold">Factura {f.numero} · Cuenta {f.cuenta}</h3>
      <p className="text-xs text-muted-foreground">Fila {f.fila} · {etiquetas[f.resultado] ?? f.resultado}</p>
      {f.motivo && <p className="text-sm">{f.motivo}</p>}
      <Table><TableHeader><TableRow>{["Campo","Antes de la carga","En el Excel","Después de la carga"].map(h=><TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{f.campos.map(c=><TableRow key={c.campo}><TableCell>{c.campo}</TableCell><TableCell>{mostrar(c.campo,c.anterior)}</TableCell><TableCell>{mostrar(c.campo,c.informado)}</TableCell><TableCell>{mostrar(c.campo,c.vigente)}</TableCell></TableRow>)}</TableBody>
      </Table>
    </article>)}
    {data && data.totalPages > 1 && <div className="flex gap-3 items-center">
      <Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</Button>
      <span>Página {page+1} de {data.totalPages}</span>
      <Button variant="outline" disabled={page+1>=data.totalPages} onClick={()=>setPage(p=>p+1)}>Siguiente</Button>
    </div>}
  </section>;
}
