package pe.morosos.reporte.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/** Billing is assigned to period + one month. Receipts use actual payment dates. */
public final class FacturacionRecaudacionCalculator {
    public record Registro(String cuenta, UUID grupoId, String grupo, LocalDate periodo,
                           boolean plan, boolean pagado, LocalDate fechaPago,
                           BigDecimal facturado, BigDecimal cobrado, BigDecimal descuento, String beneficio,
                           String numero, LocalDate fechaEmision, LocalDate fechaVencimiento) {
        public Registro(String cuenta, UUID grupoId, String grupo, LocalDate periodo, boolean plan, boolean pagado, LocalDate fechaPago, BigDecimal facturado, BigDecimal cobrado, BigDecimal descuento, String beneficio) {
            this(cuenta,grupoId,grupo,periodo,plan,pagado,fechaPago,facturado,cobrado,descuento,beneficio,null,null,null);
        }
    }
    public record Pago(String cuenta, String numero, String grupo, String tipo, LocalDate fechaEmision,
                       LocalDate fechaVencimiento, LocalDate fechaPago, BigDecimal importe, String cumplimiento, Long diasAtraso) {}
    public record Indicadores(BigDecimal facturado, BigDecimal recaudado, long conceptosEmitidos,
                              long conceptosSinImporte, long conceptosPagados, long cuentasPagaron,
                              BigDecimal recaudadoNormal, BigDecimal recaudadoPlanes,
                              long conceptosNormalesPagados, long conceptosPlanPagados,
                              long cuentasNormales, long cuentasPlanes, BigDecimal descuentosDocumentados,
                              Map<String, Descuento> descuentosPorBeneficio, long descuentosARevisar, BigDecimal recaudadoCaudalimetros,
                              long conceptosCaudalimetroPagados, long cuentasCaudalimetros, BigDecimal facturadoNormal, BigDecimal facturadoPlanes, BigDecimal facturadoOtros) {}
    public record Descuento(long conceptos, BigDecimal importe, long sinImporte) {
        Descuento sumar(Descuento otro) {
            return new Descuento(conceptos + otro.conceptos, importe.add(otro.importe), sinImporte + otro.sinImporte);
        }
    }
    public record Mes(String mes, Indicadores indicadores) {}
    public record Grupo(UUID id, String nombre, Indicadores indicadores) {}
    public record Reporte(String desde, String hasta, Indicadores totales, List<Mes> meses, List<Grupo> grupos, List<Mes> dias, List<Pago> pagos, long emisionesEstimadas) {}

    public Reporte calcular(List<Registro> registros, YearMonth desde, YearMonth hasta) {
        return calcular(registros, desde.atDay(1), hasta.atEndOfMonth());
    }
    public Reporte calcular(List<Registro> registros, LocalDate fechaDesde, LocalDate fechaHasta) {
        return calcular(registros,fechaDesde,fechaHasta,FacturacionRecaudacionService.Tipo.TODOS);
    }
    public Reporte calcular(List<Registro> registros, LocalDate fechaDesde, LocalDate fechaHasta, FacturacionRecaudacionService.Tipo tipo) {
        return calcular(registros,fechaDesde,fechaHasta,tipo,null,null);
    }
    public Reporte calcular(List<Registro> registros, LocalDate fechaDesde, LocalDate fechaHasta, FacturacionRecaudacionService.Tipo tipo,
            Set<FacturacionRecaudacionService.Concepto> conceptos, Set<FacturacionRecaudacionService.Cumplimiento> cumplimiento) {
        YearMonth desde = YearMonth.from(fechaDesde), hasta = YearMonth.from(fechaHasta);
        Map<LocalDate, Acumulador> dias = new LinkedHashMap<>();
        if (java.time.temporal.ChronoUnit.DAYS.between(fechaDesde,fechaHasta) <= 62)
            for (LocalDate d=fechaDesde; !d.isAfter(fechaHasta); d=d.plusDays(1)) dias.put(d,new Acumulador());
        Map<YearMonth, Acumulador> meses = new LinkedHashMap<>();
        for (YearMonth m=desde; !m.isAfter(hasta); m=m.plusMonths(1)) meses.put(m,new Acumulador());
        Map<UUID, Acumulador> grupos = new LinkedHashMap<>();
        Map<UUID, String> nombres = new HashMap<>();
        Acumulador total = new Acumulador();
        List<Pago> pagos = new ArrayList<>();
        long estimadas = 0;
        for (Registro r:registros) {
            YearMonth emision = !r.plan() && r.periodo()!=null ? YearMonth.from(r.periodo()).plusMonths(1) : conceptos != null && r.fechaEmision()!=null ? YearMonth.from(r.fechaEmision()) : null;
            YearMonth pago = r.pagado() && r.fechaPago()!=null && r.cobrado().signum()>0 ? YearMonth.from(r.fechaPago()) : null;
            boolean tipoIncluido = conceptos == null || conceptos.contains(r.plan() ? FacturacionRecaudacionService.Concepto.PLAN : r.periodo()==null ? FacturacionRecaudacionService.Concepto.OTROS : FacturacionRecaudacionService.Concepto.NORMAL);
            boolean fechaEmisionIncluida = (!r.plan() && r.periodo()!=null) || (r.fechaEmision()!=null && !r.fechaEmision().isBefore(fechaDesde) && !r.fechaEmision().isAfter(fechaHasta));
            boolean emitido = tipoIncluido && fechaEmisionIncluida && meses.containsKey(emision), pagado = meses.containsKey(pago) && tipoIncluido && (conceptos != null || aceptaCobro(r,tipo)) && (cumplimiento == null || cumplimiento.contains(r.fechaVencimiento()==null ? FacturacionRecaudacionService.Cumplimiento.SIN_FECHA : r.fechaPago().isAfter(r.fechaVencimiento()) ? FacturacionRecaudacionService.Cumplimiento.FUERA_TERMINO : FacturacionRecaudacionService.Cumplimiento.EN_TERMINO)) && !r.fechaPago().isBefore(fechaDesde) && !r.fechaPago().isAfter(fechaHasta);
            if (!emitido && !pagado) continue;
            var grupo = grupos.computeIfAbsent(r.grupoId(), k -> new Acumulador());
            nombres.put(r.grupoId(), r.grupo());
            if (emitido && r.fechaEmision() == null) estimadas++;
            if (emitido) {total.emitir(r); grupo.emitir(r); meses.get(emision).emitir(r);}
            if (pagado) {
                Long atraso = r.fechaVencimiento() == null ? null : Math.max(0,java.time.temporal.ChronoUnit.DAYS.between(r.fechaVencimiento(), r.fechaPago()));
                pagos.add(new Pago(r.cuenta(),r.numero(),r.grupo(),r.plan() ? "PLAN" : r.periodo() == null ? "CAUDALIMETRO" : "NORMAL",
                    r.fechaEmision(),r.fechaVencimiento(),r.fechaPago(),r.cobrado(),atraso == null ? "SIN_FECHA" : atraso > 0 ? "FUERA_TERMINO" : "EN_TERMINO",atraso));
                total.cobrar(r); grupo.cobrar(r); meses.get(pago).cobrar(r); if(dias.containsKey(r.fechaPago())) dias.get(r.fechaPago()).cobrar(r);}
        }
        var serie=meses.entrySet().stream().map(e->new Mes(e.getKey().toString(),e.getValue().resultado())).toList();
        var desglose=grupos.entrySet().stream().map(e->new Grupo(e.getKey(),nombres.get(e.getKey()),e.getValue().resultado()))
            .sorted(Comparator.comparing(Grupo::nombre,String.CASE_INSENSITIVE_ORDER)).toList();
        return new Reporte(fechaDesde.toString(),fechaHasta.toString(),total.resultado(),serie,desglose,
            dias.entrySet().stream().map(e -> new Mes(e.getKey().toString(), e.getValue().resultado())).toList(), pagos.stream().sorted(Comparator.comparing(Pago::fechaPago).reversed().thenComparing(Pago::cuenta)).toList(), estimadas);
    }
    private static boolean aceptaCobro(Registro r, FacturacionRecaudacionService.Tipo tipo) {
        boolean normal = !r.plan() && r.periodo()!=null;
        return switch(tipo) {
            case TODOS -> true;
            case NORMAL -> normal;
            case PLAN -> r.plan();
            case CAUDALIMETRO, OTROS -> !r.plan() && r.periodo()==null;
            case VIGENTE -> normal && r.fechaVencimiento()!=null && !r.fechaPago().isAfter(r.fechaVencimiento());
            case VENCIDO -> normal && r.fechaVencimiento()!=null && r.fechaPago().isAfter(r.fechaVencimiento());
        };
    }
    private static class Acumulador {
        BigDecimal facturado=BigDecimal.ZERO, normal=BigDecimal.ZERO, planes=BigDecimal.ZERO;
        BigDecimal facturadoNormal=BigDecimal.ZERO, facturadoPlanes=BigDecimal.ZERO, facturadoOtros=BigDecimal.ZERO;
        boolean faltaNormal, faltaPlanes, faltaOtros;
        long emitidos, sinImporte, normalesPagados, planesPagados;
        Set<String> cuentas=new HashSet<>(), cuentasNormales=new HashSet<>(), cuentasPlanes=new HashSet<>();
        BigDecimal descuentosDocumentados = BigDecimal.ZERO;
        final Map<String, Descuento> descuentosPorBeneficio = new TreeMap<>();
        long descuentosARevisar;
        void emitir(Registro r) {
            if (r.descuento() != null && r.descuento().signum() > 0) {
                String tipo = r.beneficio() == null ? "Sin clasificar" : r.beneficio();
                descuentosDocumentados = descuentosDocumentados.add(r.descuento());
                descuentosPorBeneficio.merge(tipo, new Descuento(1, r.descuento(), 0), Descuento::sumar);
            } else if (r.beneficio() != null || (r.pagado() && r.cobrado().signum() > 0
                    && r.facturado() != null && r.cobrado().compareTo(r.facturado()) < 0)) {
                descuentosARevisar++;
                if (r.beneficio() != null) {
                    descuentosPorBeneficio.merge(r.beneficio(), new Descuento(0, BigDecimal.ZERO, 1), Descuento::sumar);
                }
            }
            if(r.plan()) {if(r.facturado()==null) faltaPlanes=true; else facturadoPlanes=facturadoPlanes.add(r.facturado());}
            else if(r.periodo()==null) {if(r.facturado()==null) faltaOtros=true; else facturadoOtros=facturadoOtros.add(r.facturado());}
            else {if(r.facturado()==null) faltaNormal=true; else facturadoNormal=facturadoNormal.add(r.facturado());}
            emitidos++;
            if(r.facturado()==null) sinImporte++; else facturado=facturado.add(r.facturado());
        }
        BigDecimal caudalimetros = BigDecimal.ZERO;
        long cuotasCaudalimetro;
        final Set<String> cuentasCaudalimetros = new HashSet<>();
        void cobrar(Registro r) {
            cuentas.add(r.cuenta());
            if(r.plan()) {planesPagados++; planes=planes.add(r.cobrado());cuentasPlanes.add(r.cuenta());}
            else if (r.periodo() == null) {
                cuotasCaudalimetro++;
                caudalimetros = caudalimetros.add(r.cobrado());
                cuentasCaudalimetros.add(r.cuenta());
            }
            else {normalesPagados++;normal=normal.add(r.cobrado());cuentasNormales.add(r.cuenta());}
        }
        Indicadores resultado() {
            return new Indicadores(sinImporte==0 ? facturado : null,normal.add(planes).add(caudalimetros),emitidos,sinImporte,
                normalesPagados+planesPagados+cuotasCaudalimetro,cuentas.size(),normal,planes,normalesPagados,planesPagados,
                cuentasNormales.size(),cuentasPlanes.size(), descuentosDocumentados,
                Map.copyOf(descuentosPorBeneficio), descuentosARevisar, caudalimetros, cuotasCaudalimetro, cuentasCaudalimetros.size(), faltaNormal ? null : facturadoNormal, faltaPlanes ? null : facturadoPlanes, faltaOtros ? null : facturadoOtros);
        }
    }
}
