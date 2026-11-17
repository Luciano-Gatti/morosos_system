import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, Filter, RefreshCw, Upload } from "lucide-react";

import { PERMISSIONS } from "@/auth/permissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cargasApi, type PeriodoPorRevisar } from "@/services/api/cargasApi";
import type { CargaProceso, CargaTipo } from "@/types/cargas";

const tipos: CargaTipo[] = ["INMUEBLES", "DEUDA", "FACTURACION_PAGOS"];
const importPermissions: Partial<Record<CargaTipo, string>> = {
  INMUEBLES: PERMISSIONS.CARGAS_IMPORTAR_INMUEBLES,
  DEUDA: PERMISSIONS.CARGAS_IMPORTAR_DEUDA,
  FACTURACION_PAGOS: PERMISSIONS.CARGAS_IMPORTAR_FACTURACION_PAGOS,
};
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export default function GestionCargas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTipo = searchParams.get("tipo") as CargaTipo | null;
  const [tipo, setTipo] = useState<CargaTipo | "TODAS">(tipos.includes(initialTipo as CargaTipo) ? initialTipo! : "TODAS");
  const [estado, setEstado] = useState("TODOS");
  const [ultimaComparacion, setUltimaComparacion] = useState<CargaProceso | null>(null);
  const [rows, setRows] = useState<CargaProceso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importTipo, setImportTipo] = useState<CargaTipo | "">("");
  const [candidatos, setCandidatos] = useState<PeriodoPorRevisar[] | null>(null);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const reiniciarRevision = () => { setCandidatos(null); setSeleccion([]); };
  const [file, setFile] = useState<File | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    setError(null);
    cargasApi.listar({
      page: 0,
      size: 100,
      tipo: tipo === "TODAS" ? undefined : tipo,
      estado: estado === "TODOS" ? undefined : estado,
      sort: "createdAt,desc",
    }).then((res) => setRows(res.content))
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar los procesos."))
      .finally(() => setLoading(false));
  }, [tipo, estado, refresh]);

  const openImport = () => {
    const allowed = tipos.find((value) => importPermissions[value] && hasPermission(importPermissions[value]!));
    if (!allowed) return;
    setImportTipo(tipo !== "TODAS" && importPermissions[tipo] && hasPermission(importPermissions[tipo]!) ? tipo : "");
    reiniciarRevision();
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!file || !importTipo) return;
    if (importTipo === "DEUDA" && !/^\d{4}-\d{2}$/.test(periodo)) {
      toast({ title: "Período requerido", description: "Usá el formato YYYY-MM.", variant: "destructive" });
      return;
    }
    try {
      setImporting(true);
      if (importTipo === "FACTURACION_PAGOS" && candidatos === null) {
        const filas = await cargasApi.revisarPeriodos(file);
        setCandidatos(filas);
        if (filas.length) return;
      }
      const carga = await cargasApi.importar(importTipo, file, periodo, seleccion);
      setUltimaComparacion(importTipo === "FACTURACION_PAGOS" ? carga : null);
      setDialogOpen(false);
      setFile(null);
      setPeriodo("");
      setTipo(importTipo);
      setSearchParams({ tipo: importTipo });
      setRefresh((value) => value + 1);
      toast({ title: "Carga procesada", description: carga.facturasConDiferencias != null ? resumenFacturas(carga) : "El resultado quedó registrado en el historial de cargas." });
    } catch (e) {
      toast({
        title: "No se pudo procesar la carga",
        description: e instanceof Error ? (e.message.includes("Encabezados inválidos") ? `${e.message}. El tipo seleccionado es ${label(importTipo)}. Si el archivo contiene facturas, elegí Facturación y pagos.` : e.message) : "Error inesperado.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const canImport = Object.values(importPermissions).some((permission) => permission && hasPermission(permission));

  return (
    <>
      <AppHeader
        title="Gestión de cargas"
        description="Padrón, deuda, facturación y pagos con historial de cargas."
        breadcrumb={[{ label: "Gestión de cargas" }]}
        actions={canImport ? (
          <Button size="sm" className="h-9 gap-2" onClick={openImport}>
            <Upload className="h-4 w-4" /> Nueva carga
          </Button>
        ) : undefined}
      />
      <main className="flex-1 space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {ultimaComparacion && tipo === "FACTURACION_PAGOS" && <div role="status" className="rounded-md border bg-surface p-4">
          <strong>Resultado de {ultimaComparacion.archivoNombre}</strong>
          <p className="text-sm">{resumenFacturas(ultimaComparacion)}</p>
          {hasPermission(PERMISSIONS.CARGAS_VER_DETALLE) && <Link to={`/cargas/${ultimaComparacion.id}`} className="text-sm text-primary underline">Ver comparación de facturas</Link>}
        </div>}
        <section className="rounded-md border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={tipo} onValueChange={(value) => {
              const next = value as CargaTipo | "TODAS";
              setTipo(next);
              setSearchParams(next === "TODAS" ? {} : { tipo: next });
            }}>
              <SelectTrigger className="h-8 w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todos los tipos</SelectItem>
                {tipos.map((value) => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="h-8 w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
                <SelectItem value="COMPLETADA_CON_INCIDENCIAS">Con incidencias</SelectItem>
                <SelectItem value="PROCESANDO">Procesando</SelectItem>
                <SelectItem value="FALLIDA">Fallida</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="ml-auto h-8 gap-2" onClick={() => setRefresh((v) => v + 1)}>
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Tipo / origen</TableHead><TableHead>Archivo</TableHead>
                <TableHead>Estado</TableHead><TableHead className="text-right">Procesados</TableHead>
                <TableHead className="text-right">Incidencias</TableHead><TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-16" />
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((row) => <TableRow key={row.id}>
                  <TableCell className="text-xs">{new Date(row.createdAt).toLocaleString("es-AR")}</TableCell>
                  <TableCell><div className="text-sm font-medium">{label(row.tipo)}</div><div className="text-xs text-muted-foreground">{row.origen}</div></TableCell>
                  <TableCell className="max-w-[240px] truncate text-sm">{row.archivoNombre ?? row.sistemaOrigen ?? "-"}</TableCell>
                  <TableCell><Estado estado={row.estado} /></TableCell>
                  <TableCell className="text-right tabular">{row.procesados}</TableCell>
                  <TableCell className="text-right tabular">{row.errores + row.conflictos + row.noEncontrados}</TableCell>
                  <TableCell className="text-right tabular">{money.format(row.montoTotal ?? 0)}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" asChild><Link to={`/cargas/${row.id}`}><Eye className="h-4 w-4" /></Link></Button></TableCell>
                </TableRow>)}
                {!rows.length && <TableRow><TableCell colSpan={8} className="h-28 text-center text-muted-foreground">{loading ? "Cargando..." : error ?? "No hay cargas para los filtros seleccionados."}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>

      <Dialog open={dialogOpen} onOpenChange={(open) => !importing && setDialogOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva carga</DialogTitle>
            <DialogDescription>El archivo se valida, procesa y registra con métricas e incidencias.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={importTipo} disabled={importing} onValueChange={(value) => { reiniciarRevision(); setImportTipo(value as CargaTipo); }}>
              <SelectTrigger aria-label="Tipo de carga"><SelectValue placeholder="Seleccioná el tipo de carga" /></SelectTrigger>
              <SelectContent>
                {tipos.filter((value) => importPermissions[value] && hasPermission(importPermissions[value]!))
                  .map((value) => <SelectItem key={value} value={value}>{label(value)}</SelectItem>)}
              </SelectContent>
            </Select>
            {(importTipo === "DEUDA") && (
              <div className="space-y-1">
                <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Obligatorio para imputar el saldo inicial al período correcto.
                </p>
              </div>
            )}
            {importTipo === "FACTURACION_PAGOS" && (
              <p className="text-xs text-muted-foreground">Excel con número de factura, inmueble, período, estado, fecha de pago e importe a cobrar. El período “/” identifica planes de pago. Las cuentas de prueba se omiten. Esta carga no cambia automáticamente la deuda ni las etapas.</p>
            )}
            <input ref={inputRef} type="file" accept={importTipo === "FACTURACION_PAGOS" ? ".xlsx,.xls" : ".csv,.xlsx,.xls"} className="hidden" disabled={importing} onChange={(e) => {reiniciarRevision(); setFile(e.target.files?.[0] ?? null);}} />
            <Button type="button" variant="outline" className="w-full justify-start" disabled={importing} onClick={() => inputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> {file?.name ?? (importTipo === "FACTURACION_PAGOS" ? "Seleccionar Excel" : "Seleccionar Excel o CSV")}
            </Button>
            {importTipo === "FACTURACION_PAGOS" && candidatos && candidatos.length > 0 && (
              <fieldset disabled={importing} className="space-y-2 rounded-md border p-3">
                <legend className="px-1 text-sm font-semibold">Revisar períodos</legend>
                <p className="text-sm">Marcá las filas que correspondan a cuotas de caudalímetro. Las que queden sin marcar se registrarán como incidencias.</p>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span>{seleccion.length} de {candidatos.length} seleccionadas</span>
                  <Button variant="outline" size="sm" onClick={() => setSeleccion(seleccion.length === candidatos.length ? [] : candidatos.map(c => c.fila))}>
                    {seleccion.length === candidatos.length ? "Desmarcar todas" : "Marcar todas"}
                  </Button>
                </div>
                <div className="max-h-56 space-y-1 overflow-auto">
                  {candidatos.map(c => <label key={c.fila} className="flex items-start gap-2 border-t py-2 text-sm">
                    <input type="checkbox" checked={seleccion.includes(c.fila)} onChange={e => setSeleccion(actual => actual.includes(c.fila) ? actual.filter(n => n !== c.fila) : [...actual,c.fila])}/>
                    <span><strong>{c.periodo}</strong> · Factura {c.numero} · Cuenta {c.cuenta}<br/>
                      <small>Fila {c.fila} · {c.estado} · Importe {c.importe}</small></span>
                  </label>)}
                </div>
              </fieldset>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={importing}>Cancelar</Button>
            <Button onClick={submit} disabled={!file || !importTipo || importing}>{importing ? "Procesando..." : candidatos?.length ? "Confirmar selección y cargar" : "Procesar carga"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function label(tipo: CargaTipo) {
  return ({ INMUEBLES: "Inmuebles", DEUDA: "Deuda", FACTURACION_PAGOS: "Facturación y pagos" })[tipo];
}

function Estado({ estado }: { estado: CargaProceso["estado"] }) {
  const styles = estado === "COMPLETADA" ? "bg-emerald-50 text-emerald-800" :
    estado === "FALLIDA" ? "bg-red-50 text-red-800" :
    estado === "PROCESANDO" ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-900";
  return <span className={`rounded px-2 py-1 text-xs font-medium ${styles}`}>{estado.replaceAll("_", " ")}</span>;
}

function resumenFacturas(carga: CargaProceso) {
  return `${carga.creados} nuevas · ${carga.facturasConDiferencias ?? 0} repetidas con diferencias · ${carga.facturasRepetidasIguales ?? 0} repetidas iguales`;
}
