package pe.morosos.reporte.service;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.morosos.common.exception.ValidationException;
import static pe.morosos.reporte.service.FacturacionRecaudacionService.*;

@Service
@RequiredArgsConstructor
public class MovimientoDetalleService {
    private final JdbcClient jdbc;
    public enum Movimiento { FACTURACION, RECAUDACION }
    public record Fila(String cuenta,String titular,String numero,String tipo,String periodo,String grupo,
                       LocalDate fechaEmision,LocalDate fechaVencimiento,LocalDate fechaPago,
                       BigDecimal neto,BigDecimal iva,BigDecimal descuento,BigDecimal importe,String cumplimiento) {}
    public record Detalle(List<Fila> filas,BigDecimal total,long cuentas,long sinImporte) {}
    record Consulta(String sql,List<Object> params) {}

    @Transactional(readOnly=true)
    public Detalle obtener(String desde,String hasta,String mes,Movimiento movimiento,UUID grupoId,UUID distritoId,
                           Set<Concepto> conceptos,Set<Cumplimiento> cumplimiento) {
        var consulta=consulta(desde,hasta,mes,movimiento,grupoId,distritoId,conceptos,cumplimiento);
        var filas=jdbc.sql(consulta.sql()).params(consulta.params()).query((rs,n)->new Fila(
            rs.getString("cuenta"),rs.getString("titular"),rs.getString("numero"),rs.getString("tipo"),rs.getString("periodo_texto"),rs.getString("grupo"),
            rs.getObject("fecha_emision",LocalDate.class),rs.getObject("fecha_vencimiento",LocalDate.class),rs.getObject("fecha_pago",LocalDate.class),
            rs.getBigDecimal("importe_neto"),rs.getBigDecimal("iva"),rs.getBigDecimal("importe_descuentos"),rs.getBigDecimal("importe_detalle"),rs.getString("cumplimiento"))).list();
        long faltantes=filas.stream().filter(f->f.importe()==null).count();
        return new Detalle(filas,faltantes>0?null:filas.stream().map(Fila::importe).reduce(BigDecimal.ZERO,BigDecimal::add),
            filas.stream().map(Fila::cuenta).distinct().count(),faltantes);
    }
    static Consulta consulta(String desde,String hasta,String mes,Movimiento movimiento,UUID grupoId,UUID distritoId,
                             Set<Concepto> conceptos,Set<Cumplimiento> cumplimiento) {
        LocalDate inicio,fin;YearMonth month;
        try {inicio="INICIO".equals(desde)?LocalDate.of(1,1,1):LocalDate.parse(desde);fin=LocalDate.parse(hasta);month=YearMonth.parse(mes);}
        catch(Exception e){throw new ValidationException("Fechas o mes de detalle inválidos.",null);}
        if(fin.isBefore(inicio)||month.isBefore(YearMonth.from(inicio))||month.isAfter(YearMonth.from(fin)))
            throw new ValidationException("El mes debe pertenecer al rango del reporte.",null);
        LocalDate primero=inicio.isAfter(month.atDay(1))?inicio:month.atDay(1);
        LocalDate ultimo=fin.isBefore(month.atEndOfMonth())?fin:month.atEndOfMonth();
        String tipo="case when f.plan_pago then 'PLAN' when f.periodo is not null then 'NORMAL' else 'OTROS' end";
        String plazo="case when f.fecha_vencimiento is null then 'SIN_FECHA' when f.fecha_pago>f.fecha_vencimiento then 'FUERA_TERMINO' else 'EN_TERMINO' end";
        String sql="select f.cuenta,i.titular,f.numero,"+tipo+" as tipo,coalesce(to_char(f.periodo,'MM/YYYY'),f.codigo_caudalimetro,'/') as periodo_texto,g.nombre as grupo,"
            +"f.fecha_emision,f.fecha_vencimiento,f.fecha_pago,f.importe_neto,f.iva,f.importe_descuentos,"
            +(movimiento==Movimiento.FACTURACION?"f.importe_neto+f.iva-f.importe_descuentos":"f.importe")+" as importe_detalle,"+plazo+" as cumplimiento "
            +"from factura_importada f join inmueble i on i.id=f.inmueble_id join grupo g on g.id=i.grupo_id where i.es_prueba=false";
        var params=new ArrayList<Object>();
        if(movimiento==Movimiento.FACTURACION) {
            sql+=" and ((f.plan_pago=false and f.periodo>=? and f.periodo<?) or ((f.plan_pago=true or f.periodo is null) and f.fecha_emision>=? and f.fecha_emision<?))";
            params.addAll(List.of(month.minusMonths(1).atDay(1),month.atDay(1),primero,ultimo.plusDays(1)));
        } else {
            sql+=" and f.pagado=true and f.importe>0 and f.fecha_pago>=? and f.fecha_pago<?";
            params.addAll(List.of(primero,ultimo.plusDays(1)));
        }
        if(grupoId!=null){sql+=" and i.grupo_id=?";params.add(grupoId);}
        if(distritoId!=null){sql+=" and i.distrito_id=?";params.add(distritoId);}
        if(conceptos!=null) {sql+=in(tipo,conceptos.size());conceptos.forEach(c->params.add(c.name()));}
        if(movimiento==Movimiento.RECAUDACION&&cumplimiento!=null) {sql+=in(plazo,cumplimiento.size());cumplimiento.forEach(c->params.add(c.name()));}
        return new Consulta(sql+" order by f.cuenta,f.numero",params);
    }
    private static String in(String field,int size) {
        return size==0?" and false":" and ("+field+") in ("+String.join(",",Collections.nCopies(size,"?"))+")";
    }
}
