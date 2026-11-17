import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileJson,
  Filter,
} from "lucide-react";

import { CambiosFactura } from "@/components/cargas/CambiosFactura";
import { FacturasCarga } from "@/components/cargas/FacturasCarga";
import { PERMISSIONS } from "@/auth/permissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  downloadTextFile,
  incidenciasToCsv,
  incidenciasToJson,
} from "@/lib/cargaIncidenciasExport";
import { cargasApi } from "@/services/api/cargasApi";
import type {
  CargaIncidencia,
  CargaIncidenciaFilters,
  CargaIncidenciaResultado,
  CargaProceso,
} from "@/types/cargas";

const PAGE_SIZE = 25;
const EMPTY_FILTERS: FilterForm = {
  resultado: "TODOS",
  cuenta: "",
  codigo: "",
  usuario: "",
  desde: "",
  hasta: "",
};

type FilterForm = {
  resultado: CargaIncidenciaResultado | "TODOS";
  cuenta: string;
  codigo: string;
  usuario: string;
  desde: string;
  hasta: string;
};

export default function CargaProcesoDetalle() {
  const { id = "" } = useParams();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canViewIncidents = hasPermission(PERMISSIONS.CARGAS_VER_ERRORES);
  const [carga, setCarga] = useState<CargaProceso | null>(null);
  const [incidencias, setIncidencias] = useState<CargaIncidencia[]>([]);
  const [filters, setFilters] = useState<FilterForm>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<CargaIncidenciaFilters>({});
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<CargaIncidencia | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargasApi.obtener(id)
      .then(setCarga)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle."));
  }, [id]);

  const loadIncidents = useCallback(() => {
    if (!canViewIncidents) return;
    setLoading(true);
    setError(null);
    cargasApi.incidencias(id, { ...appliedFilters, page, size: PAGE_SIZE })
      .then((result) => {
        setIncidencias(result.content);
        setTotalElements(result.totalElements);
        setTotalPages(result.totalPages);
      })
      .catch((cause) => {
        setIncidencias([]);
        setTotalElements(0);
        setTotalPages(0);
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las incidencias.");
      })
      .finally(() => setLoading(false));
  }, [appliedFilters, canViewIncidents, id, page]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
      toast({
        title: "Rango de fechas inválido",
        description: "La fecha desde no puede ser posterior a la fecha hasta.",
        variant: "destructive",
      });
      return;
    }
    setPage(0);
    setAppliedFilters(toApiFilters(filters));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
    setAppliedFilters({});
  };

  const exportRows = async (format: "csv" | "json") => {
    try {
      setExporting(true);
      const rows = await cargasApi.todasLasIncidencias(id, appliedFilters);
      const base = `incidencias_${carga?.tipo.toLowerCase() ?? "carga"}_${id}`;
      if (format === "csv") {
        downloadTextFile(`${base}.csv`, incidenciasToCsv(rows), "text/csv;charset=utf-8");
      } else {
        downloadTextFile(`${base}.json`, incidenciasToJson(rows), "application/json;charset=utf-8");
      }
      toast({ title: "Exportación generada", description: `${rows.length} incidencias descargadas.` });
    } catch (cause) {
      toast({
        title: "No se pudo exportar",
        description: cause instanceof Error ? cause.message : "Error inesperado.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <AppHeader
        title={carga ? `Carga de ${carga.tipo.toLowerCase()}` : "Detalle de carga"}
        description={carga ? cargaDescription(carga) : undefined}
        breadcrumb={[{ label: "Cargas", to: "/cargas" }, { label: "Detalle" }]}
        actions={(
          <Button variant="outline" size="sm" asChild>
            <Link to="/cargas"><ArrowLeft className="mr-2 h-4 w-4" />Volver</Link>
          </Button>
        )}
      />

      <main className="flex-1 space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        {error && (
          <div className="rounded border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {carga && (
          <>
            <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Procesados" value={carga.procesados} />
              <Metric label="Creados / actualizados" value={`${carga.creados} / ${carga.actualizados}`} />
              <Metric label="Sin cambios / ignorados" value={`${carga.sinCambios} / ${carga.ignorados}`} />
              <Metric label="Cuentas no encontradas" value={carga.noEncontrados} />
              <Metric label="Conflictos / errores" value={`${carga.conflictos} / ${carga.errores}`} />
            </section>
            <section className="grid gap-3 rounded-md border border-border bg-surface p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Data label="Origen" value={carga.origen} />
              <Data label="Archivo / sistema" value={carga.archivoNombre ?? carga.sistemaOrigen ?? "-"} />
              <Data label="Período" value={carga.periodoReferencia ?? "-"} />
              <Data label="Ejecutado por" value={carga.createdBy ?? "-"} />
            </section>
          </>
        )}

        {carga?.tipo === "FACTURACION_PAGOS" && <CambiosFactura key={carga.id} carga={carga} />}
        {carga?.tipo === "FACTURACION_PAGOS" && <FacturasCarga key={id} id={id} cobrado={carga.montoTotal} />}
        {!canViewIncidents ? (
          <div className="rounded-md border border-border bg-surface p-6 text-sm text-muted-foreground">
            No tenés permiso para consultar las incidencias de esta carga.
          </div>
        ) : (
          <section className="rounded-md border border-border bg-surface shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" /> Errores e incidencias
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {totalElements} coincidencias. El payload conserva los datos técnicos recibidos.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={exporting || totalElements === 0} onClick={() => void exportRows("csv")}>
                  <Download className="mr-2 h-4 w-4" />CSV
                </Button>
                <Button variant="outline" size="sm" disabled={exporting || totalElements === 0} onClick={() => void exportRows("json")}>
                  <FileJson className="mr-2 h-4 w-4" />JSON
                </Button>
              </div>
            </div>

            <form onSubmit={applyFilters} className="grid gap-3 border-b border-border bg-surface-muted/30 p-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-1">
                <Label>Resultado</Label>
                <Select value={filters.resultado} onValueChange={(value) => setFilters((current) => ({ ...current, resultado: value as FilterForm["resultado"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                    <SelectItem value="CONFLICTO">Conflicto</SelectItem>
                    <SelectItem value="NO_ENCONTRADO">No encontrado</SelectItem>
                    <SelectItem value="IGNORADO">Ignorado</SelectItem>
                    <SelectItem value="ADVERTENCIA">Advertencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FilterInput label="Cuenta" value={filters.cuenta} onChange={(value) => setFilters((current) => ({ ...current, cuenta: value }))} />
              <FilterInput label="Código" value={filters.codigo} onChange={(value) => setFilters((current) => ({ ...current, codigo: value }))} />
              <FilterInput label="Usuario" value={filters.usuario} onChange={(value) => setFilters((current) => ({ ...current, usuario: value }))} />
              <FilterInput label="Desde" type="date" value={filters.desde} onChange={(value) => setFilters((current) => ({ ...current, desde: value }))} />
              <FilterInput label="Hasta" type="date" value={filters.hasta} onChange={(value) => setFilters((current) => ({ ...current, hasta: value }))} />
              <div className="flex gap-2 md:col-span-2 xl:col-span-6">
                <Button type="submit" size="sm"><Filter className="mr-2 h-4 w-4" />Aplicar filtros</Button>
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>Limpiar</Button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Detalle</TableHead>
                    <TableHead>Usuario / fecha</TableHead>
                    <TableHead className="w-16">Datos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidencias.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.fila ?? "-"}</TableCell>
                      <TableCell>{row.cuenta ?? "-"}</TableCell>
                      <TableCell><ResultBadge result={row.resultado} /></TableCell>
                      <TableCell className="font-mono text-xs">{row.codigo ?? "-"}</TableCell>
                      <TableCell className="min-w-64 max-w-xl">{row.mensaje}</TableCell>
                      <TableCell className="text-xs">
                        <div>{row.createdBy ?? "-"}</div>
                        <div className="text-muted-foreground">{formatDate(row.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={row.payload == null}
                          onClick={() => setSelected(row)}
                          aria-label="Ver payload técnico"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && incidencias.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        La carga no registró incidencias para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Cargando incidencias...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Página {totalPages === 0 ? 0 : page + 1} de {totalPages} · {totalElements} registros
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>
                  Siguiente<ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payload técnico</DialogTitle>
            <DialogDescription>
              {selected?.codigo ?? selected?.resultado} · cuenta {selected?.cuenta ?? "sin cuenta"}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md border border-border bg-muted p-4 text-xs">
            {selected?.payload == null ? "Sin payload." : JSON.stringify(selected.payload, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface p-4">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular">{value}</div>
    </div>
  );
}

function Data({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs uppercase text-muted-foreground">{label}</div><div className="mt-1">{value}</div></div>;
}

function FilterInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ResultBadge({ result }: { result: CargaIncidenciaResultado }) {
  const tones: Record<CargaIncidenciaResultado, string> = {
    ERROR: "bg-destructive/10 text-destructive",
    CONFLICTO: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    NO_ENCONTRADO: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
    IGNORADO: "bg-muted text-muted-foreground",
    ADVERTENCIA: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  };
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${tones[result]}`}>{result.replaceAll("_", " ")}</span>;
}

function toApiFilters(filters: FilterForm): CargaIncidenciaFilters {
  return {
    resultado: filters.resultado === "TODOS" ? undefined : filters.resultado,
    cuenta: filters.cuenta.trim() || undefined,
    codigo: filters.codigo.trim() || undefined,
    usuario: filters.usuario.trim() || undefined,
    desde: filters.desde ? localDateStart(filters.desde) : undefined,
    hasta: filters.hasta ? localDateEnd(filters.hasta) : undefined,
  };
}

function localDateStart(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function localDateEnd(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-AR");
}

function cargaDescription(carga: CargaProceso) {
  return [
    carga.estado.replaceAll("_", " "),
    carga.archivoNombre ?? carga.sistemaOrigen,
    carga.periodoReferencia,
  ].filter(Boolean).join(" · ");
}
