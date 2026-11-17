package pe.morosos.reporte.service;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.morosos.common.exception.ValidationException;

@Service
@RequiredArgsConstructor
public class FacturacionRecaudacionService {
    private final JdbcClient jdbc;
    public enum Tipo { TODOS, NORMAL, PLAN, CAUDALIMETRO, VIGENTE, VENCIDO, OTROS }
    public enum Concepto { NORMAL, PLAN, OTROS, NINGUNO }
    public enum Cumplimiento { EN_TERMINO, FUERA_TERMINO, SIN_FECHA, NINGUNO }
    public record OpcionFiltro(UUID id, String nombre) {}
    public record Respuesta(FacturacionRecaudacionCalculator.Reporte reporte, List<OpcionFiltro> gruposDisponibles, List<OpcionFiltro> distritosDisponibles) {}

    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Respuesta obtener(String desde, String hasta, UUID grupoId, UUID distritoId, Tipo tipo) {
        return obtener(desde,hasta,grupoId,distritoId,tipo,null,null);
    }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Respuesta obtener(String desde, String hasta, UUID grupoId, UUID distritoId, Tipo tipo, Set<Concepto> conceptos, Set<Cumplimiento> cumplimiento) {
        boolean completo = "INICIO".equals(desde);
        LocalDate inicio, fin;
        try {
            inicio = completo ? LocalDate.of(1,1,1) : fecha(desde, false);
            fin = fecha(hasta, true);
        } catch(Exception e) {throw new ValidationException("Usá fechas con formato AAAA-MM-DD.",null);}
        if(fin.isBefore(inicio) || (!completo && ChronoUnit.MONTHS.between(YearMonth.from(inicio),YearMonth.from(fin))>119))
            throw new ValidationException("El rango debe estar ordenado y no superar 120 meses. Usá Desde el inicio para el historial completo.",null);
        String sql="""
            select f.numero,f.fecha_emision,f.fecha_vencimiento,f.cuenta,f.periodo,f.plan_pago,f.pagado,f.fecha_pago,f.importe,
                   f.importe_neto+f.iva-f.importe_descuentos as facturado,
                   f.importe_descuentos, coalesce(f.beneficio_descuento, i.beneficio_cuenta) as beneficio_descuento, i.grupo_id,g.nombre as grupo_nombre
            from factura_importada f join inmueble i on i.id=f.inmueble_id
            join grupo g on g.id=i.grupo_id
            where i.es_prueba=false and (
              (f.plan_pago=false and f.periodo >= ? and f.periodo < ?)
              or (f.pagado=true and f.fecha_pago >= ? and f.fecha_pago < ?))
            """;
        if (conceptos != null) sql=sql.replace("or (f.pagado=true", "or ((f.plan_pago=true or f.periodo is null) and f.fecha_emision >= ? and f.fecha_emision < ?) or (f.pagado=true");
        List<Object> params=new ArrayList<>(List.of(inicio.withDayOfMonth(1).minusMonths(1),fin.withDayOfMonth(1),inicio,fin.plusDays(1)));
        if(conceptos != null) {params.add(2,inicio);params.add(3,fin.plusDays(1));}
        if(grupoId!=null) {sql+=" and i.grupo_id=?";params.add(grupoId);}
        if(distritoId!=null) {sql+=" and i.distrito_id=?";params.add(distritoId);}
        var registros=jdbc.sql(sql).params(params).query((rs,n)->new FacturacionRecaudacionCalculator.Registro(
            rs.getString("cuenta"),rs.getObject("grupo_id",UUID.class),rs.getString("grupo_nombre"),
            rs.getObject("periodo",LocalDate.class),rs.getBoolean("plan_pago"),rs.getBoolean("pagado"),
            rs.getObject("fecha_pago",LocalDate.class),rs.getBigDecimal("facturado"),rs.getBigDecimal("importe"),
            rs.getBigDecimal("importe_descuentos"),rs.getString("beneficio_descuento"),rs.getString("numero"),rs.getObject("fecha_emision",LocalDate.class),rs.getObject("fecha_vencimiento",LocalDate.class))).list();
        var grupos=jdbc.sql("""
            select distinct g.id,g.nombre from grupo g join inmueble i on i.grupo_id=g.id
            join factura_importada f on f.inmueble_id=i.id where i.es_prueba=false order by g.nombre
            """).query((rs,n)->new OpcionFiltro(rs.getObject("id",UUID.class),rs.getString("nombre"))).list();
        var distritos = jdbc.sql("""
            select distinct d.id,d.nombre from distrito d join inmueble i on i.distrito_id=d.id
            join factura_importada f on f.inmueble_id=i.id where i.es_prueba=false order by d.nombre
            """).query((rs,n)->new OpcionFiltro(rs.getObject("id",UUID.class),rs.getString("nombre"))).list();
        if (completo) {
            LocalDate primera = fin;
            for (var r : registros) {
                LocalDate emision = r.periodo() != null && !r.plan() ? r.periodo().withDayOfMonth(1).plusMonths(1) : conceptos != null ? r.fechaEmision() : null;
                if (emision != null && emision.isBefore(primera)) primera = emision;
                if (r.pagado() && r.fechaPago() != null && r.cobrado().signum() > 0 && r.fechaPago().isBefore(primera)) primera = r.fechaPago();
            }
            inicio = primera;
        }
        return new Respuesta(new FacturacionRecaudacionCalculator().calcular(registros,inicio,fin,tipo,conceptos,cumplimiento),grupos,distritos);
    }
    private static LocalDate fecha(String valor, boolean fin) {
        if (valor != null && valor.length() == 7) {
            YearMonth mes = YearMonth.parse(valor);
            return fin ? mes.atEndOfMonth() : mes.atDay(1);
        }
        return LocalDate.parse(valor);
    }
}
