import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SpringPage } from "@/types/pagination";

type Factura = { fechaEmision?: string | null; fechaVencimiento?: string | null; fila: number; cuenta: string; numero: string; periodo: string | null; codigoCaudalimetro?: string | null; planPago: boolean; pagado: boolean; fechaPago: string | null; importe: number; resultado: string };
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
export function FacturasCarga({ id, cobrado }: { id: string; cobrado: number }) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<SpringPage<Factura> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    apiClient.get<SpringPage<Factura>>(`/api/v1/cargas/${id}/facturas?page=${page}&size=25`)
      .then(value => { if (active) setData(value); })
      .catch(cause => { if (active) { setData(null); setError(cause instanceof Error ? cause.message : "No se pudieron leer las facturas."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, page]);
  return <section className="rounded-md border border-border bg-surface p-4 space-y-3">
    <h2 className="font-semibold">Facturación y pagos importados</h2>
    <p className="text-sm">Importe cobrado de las filas aceptadas: <strong>{money.format(cobrado)}</strong></p>
    <p className="text-xs text-muted-foreground">El total corresponde a este archivo; no se suma entre cargas repetidas. Las incidencias se muestran debajo.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p>Cargando facturas…</p> : <div className="overflow-x-auto"><Table>
      <TableHeader><TableRow>{["Fila", "Cuenta", "Factura", "Período", "Estado", "Emisión", "Vencimiento", "Fecha de pago", "Importe a cobrar", "Resultado"].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{data?.content.map(f => <TableRow key={f.fila}>
        <TableCell>{f.fila}</TableCell><TableCell>{f.cuenta}</TableCell><TableCell>{f.numero}</TableCell>
        <TableCell>{f.codigoCaudalimetro ? `Cuota de caudalímetro (${f.codigoCaudalimetro})` : f.planPago ? "Plan de pago (/)" : f.periodo?.slice(0, 7)}</TableCell>
        <TableCell>{f.pagado ? "Pagado" : "No pagado"}</TableCell><TableCell>{f.fechaEmision ?? "—"}</TableCell><TableCell>{f.fechaVencimiento ?? "—"}</TableCell><TableCell>{f.fechaPago ?? "—"}</TableCell>
        <TableCell>{money.format(f.importe)}</TableCell><TableCell>{f.resultado.replaceAll("_", " ")}</TableCell>
      </TableRow>)}{data?.content.length === 0 && <TableRow><TableCell colSpan={10}>No hay facturas aceptadas en esta carga.</TableCell></TableRow>}</TableBody>
    </Table></div>}
    <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>Anterior</Button>
      <span className="text-sm">Página {page + 1} de {Math.max(data?.totalPages ?? 1, 1)}</span>
      <Button variant="outline" disabled={loading || page + 1 >= (data?.totalPages ?? 0)} onClick={() => setPage(p => p + 1)}>Siguiente</Button></div>
  </section>;
}
