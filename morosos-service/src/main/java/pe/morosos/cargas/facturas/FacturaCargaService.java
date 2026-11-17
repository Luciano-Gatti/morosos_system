package pe.morosos.cargas.facturas;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import pe.morosos.cargas.service.CargaRegistroService;
import pe.morosos.cargas.service.CargaRegistroService.CargaMetricas;
import pe.morosos.cargas.model.IncidenciaResultado;
import pe.morosos.common.exception.ValidationException;
import pe.morosos.cargas.facturas.FacturaExcelParser.*;

@Service
@RequiredArgsConstructor
public class FacturaCargaService {
    private final JdbcClient jdbc;
    private final FacturaExcelParser parser;
    private final CargaRegistroService cargas;
    private final ObjectMapper mapper;

    private record Inmueble(UUID id, boolean prueba) {}
    public record Detalle(int fila, String cuenta, String numero, LocalDate periodo, boolean planPago,
                          boolean pagado, LocalDate fechaPago, BigDecimal importe, String resultado, String codigoCaudalimetro, LocalDate fechaEmision, LocalDate fechaVencimiento) {}

    @Transactional
    public void importar(UUID cargaId, List<Fila> filas) {
        // Serialize imports so two files cannot overwrite each other's payment transition.
        jdbc.sql("select pg_advisory_xact_lock(71620423)").query(rs -> { while (rs.next()) { /* lock acquired */ } return true; });
        Map<String,Inmueble> inmuebles = new HashMap<>();
        jdbc.sql("select id,cuenta,es_prueba from inmueble").query((rs,n) -> {
            inmuebles.put(rs.getString("cuenta"), new Inmueble(rs.getObject("id",UUID.class),rs.getBoolean("es_prueba")));
            return 1;
        }).list();
        Map<String,Factura> existentes = new HashMap<>();
        jdbc.sql("select * from factura_importada").query((rs,n) -> {
            Factura f = new Factura(rs.getString("cuenta"),rs.getString("numero"),rs.getObject("periodo",LocalDate.class),
                rs.getBoolean("plan_pago"),rs.getBoolean("pagado"),rs.getObject("fecha_pago",LocalDate.class),rs.getBigDecimal("importe"),rs.getBigDecimal("importe_neto"),rs.getBigDecimal("iva"),rs.getBigDecimal("importe_descuentos"), rs.getString("beneficio_descuento"),rs.getString("codigo_caudalimetro"),rs.getObject("fecha_emision",LocalDate.class),rs.getObject("fecha_vencimiento",LocalDate.class));
            existentes.put(key(f),f); return 1;
        }).list();
        Map<String,Long> repeticiones = new HashMap<>();
        for(Fila row:filas) repeticiones.merge(row.datos().get("inmueble")+"\u0000"+row.datos().get("num factura"),1L,Long::sum);
        int creados=0,actualizados=0,sinCambios=0,ignorados=0,conflictos=0,errores=0,noEncontrados=0;
        int diferencias = 0, iguales = 0;
        BigDecimal cobrado=BigDecimal.ZERO;
        for(Fila row:filas) {
            String cuenta=row.datos().get("inmueble"); Inmueble inmueble=inmuebles.get(cuenta);
            if((inmueble!=null && inmueble.prueba()) || (inmueble==null && cuenta.equals("150-999999-999"))) {
                incidencia(cargaId,row,IncidenciaResultado.IGNORADO,"CUENTA_PRUEBA","Cuenta de prueba excluida."); ignorados++; continue;
            }
            Factura f;
            try { f=parser.convertir(row); }
            catch(ValidationException e) {incidencia(cargaId,row,IncidenciaResultado.ERROR,"FILA_INVALIDA",e.getMessage());errores++;continue;}
            if(repeticiones.get(key(f))>1) {
                incidencia(cargaId,row,IncidenciaResultado.CONFLICTO,"FACTURA_DUPLICADA","La cuenta y factura aparecen más de una vez en el archivo. No se importó ninguna de sus filas.");conflictos++;continue;
            }
            if(inmueble==null) {
                incidencia(cargaId,row,IncidenciaResultado.NO_ENCONTRADO,"INMUEBLE_NO_ENCONTRADO","La cuenta no existe en el padrón. Cargá el inmueble y volvé a importar.");noEncontrados++;continue;
            }
            Factura anterior=existentes.get(key(f));
            Factura fuente = f;
            try {
                f = conciliar(anterior, fuente);
            } catch (IllegalArgumentException ex) {
                registrarCambio(cargaId, row, anterior, fuente, anterior, "CONFLICTO", ex.getMessage());
                diferencias++;
                incidencia(cargaId,row,IncidenciaResultado.CONFLICTO,"FACTURA_MODIFICADA",ex.getMessage());
                conflictos++;
                continue;
            }
            String resultado;
            if(f.equals(anterior)) {sinCambios++;resultado="SIN_CAMBIOS";}
            else {
                jdbc.sql("""
                    insert into factura_importada(cuenta,numero,inmueble_id,periodo,plan_pago,pagado,fecha_pago,importe,carga_id,importe_neto,iva,importe_descuentos,beneficio_descuento,codigo_caudalimetro,fecha_emision,fecha_vencimiento)
                    values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    on conflict(cuenta,numero) do update set periodo=excluded.periodo,plan_pago=excluded.plan_pago,
                    pagado=excluded.pagado,fecha_pago=excluded.fecha_pago,importe=excluded.importe,
                    importe_neto=excluded.importe_neto,iva=excluded.iva,importe_descuentos=excluded.importe_descuentos,beneficio_descuento=excluded.beneficio_descuento,
                    fecha_emision=excluded.fecha_emision,fecha_vencimiento=excluded.fecha_vencimiento,
                    carga_id=excluded.carga_id,updated_at=CURRENT_TIMESTAMP
                    """).params(f.cuenta(),f.numero(),inmueble.id(),f.periodo(),f.planPago(),f.pagado(),f.fechaPago(),f.importe(),cargaId,f.neto(),f.iva(),f.descuentos(),f.beneficio(),f.codigoCaudalimetro(),f.fechaEmision(),f.fechaVencimiento()).update();
                if(anterior==null){creados++;resultado="CREADO";}else{actualizados++;resultado="ACTUALIZADO";}
            }
            if (anterior != null) {
                boolean cambio = registrarCambio(cargaId, row, anterior, fuente, f,
                        f.equals(anterior) ? "CONSERVADA" : "ACTUALIZADA", null);
                if (cambio) diferencias++; else iguales++;
            }
            jdbc.sql("""
                insert into factura_carga_detalle(carga_id,fila,cuenta,numero,periodo,plan_pago,pagado,fecha_pago,importe,resultado,importe_neto,iva,importe_descuentos,beneficio_descuento,codigo_caudalimetro,fecha_emision,fecha_vencimiento)
                values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """).params(cargaId,row.numeroFila(),f.cuenta(),f.numero(),fuente.periodo(),fuente.planPago(),fuente.pagado(),fuente.fechaPago(),fuente.importe(),resultado,fuente.neto(),fuente.iva(),fuente.descuentos(),fuente.beneficio(),fuente.codigoCaudalimetro(),fuente.fechaEmision(),fuente.fechaVencimiento()).update();
            if(fuente.pagado()) cobrado=cobrado.add(fuente.importe());
        }
        jdbc.sql("update carga_proceso set facturas_con_diferencias=?, facturas_repetidas_iguales=? where id=?")
            .params(diferencias, iguales, cargaId).update();
        cargas.finalizar(cargaId,new CargaMetricas(filas.size(),creados,actualizados,sinCambios,ignorados,conflictos,errores,noEncontrados,cobrado));
    }
    /** The invoice keeps the evidenced issue discount. The load detail keeps the source snapshot. */
    static Factura conciliar(Factura anterior, Factura nueva) {
        if (anterior == null) return nueva;
        if (!Objects.equals(anterior.periodo(), nueva.periodo()) || anterior.planPago() != nueva.planPago()
                || !Objects.equals(anterior.codigoCaudalimetro(), nueva.codigoCaudalimetro())) {
            throw new IllegalArgumentException("La factura cambia de período o tipo.");
        }
        if (anterior.neto() != null && nueva.neto() != null
                && (!anterior.neto().equals(nueva.neto()) || !anterior.iva().equals(nueva.iva()))) {
            throw new IllegalArgumentException("El neto o el IVA difieren de la emisión registrada.");
        }
        boolean previo = positivo(anterior.descuentos());
        boolean informado = positivo(nueva.descuentos());
        if (previo && informado && anterior.descuentos().compareTo(nueva.descuentos()) != 0) {
            throw new IllegalArgumentException("Hay dos importes de descuento distintos para esta factura.");
        }
        if (anterior.beneficio() != null && nueva.beneficio() != null
                && !anterior.beneficio().equals(nueva.beneficio())) {
            throw new IllegalArgumentException("El beneficio difiere del registrado para esta factura.");
        }
        boolean recuperaDescuento = informado && (!previo || (anterior.beneficio() == null && nueva.beneficio() != null));
        boolean emisionAnterior = anterior.pagado() && !nueva.pagado() && recuperaDescuento;
        if (anterior.pagado() && !emisionAnterior && (!nueva.pagado()
                || !Objects.equals(anterior.fechaPago(), nueva.fechaPago())
                || anterior.importe().compareTo(nueva.importe()) != 0)) {
            throw new IllegalArgumentException("El pago difiere del registrado para esta factura.");
        }
        Factura pago = emisionAnterior ? anterior : nueva;
        Factura base = nueva.neto() == null ? anterior : nueva;
        BigDecimal descuento = previo ? anterior.descuentos() : base.descuentos();
        String beneficio = nueva.beneficio() != null ? nueva.beneficio() : anterior.beneficio();
        LocalDate emision = nueva.fechaEmision() != null ? nueva.fechaEmision() : anterior.fechaEmision();
        LocalDate vencimiento = nueva.fechaVencimiento() != null ? nueva.fechaVencimiento() : anterior.fechaVencimiento();
        if (emision != null && vencimiento != null && vencimiento.isBefore(emision)) throw new IllegalArgumentException("El vencimiento es anterior a la emisión registrada.");
        return new Factura(nueva.cuenta(), nueva.numero(), nueva.periodo(), nueva.planPago(), pago.pagado(),
                pago.fechaPago(), pago.importe(), base.neto(), base.iva(), descuento, beneficio, nueva.codigoCaudalimetro(),
                nueva.fechaEmision() != null ? nueva.fechaEmision() : anterior.fechaEmision(),
                nueva.fechaVencimiento() != null ? nueva.fechaVencimiento() : anterior.fechaVencimiento());
    }

    private static boolean positivo(BigDecimal importe) {
        return importe != null && importe.signum() > 0;
    }

    public record Cambio(int fila, String cuenta, String numero, String resultado, String motivo,
                         List<ComparacionFactura.Campo> campos) {}

    private boolean registrarCambio(UUID cargaId, Fila fila, Factura anterior, Factura fuente, Factura vigente,
                                    String resultado, String motivo) {
        var campos = ComparacionFactura.comparar(anterior, fuente, vigente, fila.datos().containsKey("descuentos"));
        if (campos.isEmpty()) return false;
        jdbc.sql("""
            insert into factura_carga_cambio(carga_id,fila,cuenta,numero,resultado,motivo,campos)
            values(?,?,?,?,?,?,cast(? as jsonb))
            """).params(cargaId,fila.numeroFila(),fuente.cuenta(),fuente.numero(),resultado,motivo,
                    mapper.valueToTree(campos).toString()).update();
        return true;
    }

    @Transactional(readOnly=true)
    public Page<Cambio> cambios(UUID cargaId, Pageable page) {
        cargas.obtener(cargaId);
        long total = jdbc.sql("select count(*) from factura_carga_cambio where carga_id=?")
                .param(cargaId).query(Long.class).single();
        var cambios = jdbc.sql("select * from factura_carga_cambio where carga_id=? order by fila limit ? offset ?")
                .params(cargaId,page.getPageSize(),page.getOffset()).query((rs,n) -> {
                    try {
                        List<ComparacionFactura.Campo> campos = mapper.readerForListOf(ComparacionFactura.Campo.class)
                                .readValue(rs.getString("campos"));
                        return new Cambio(rs.getInt("fila"),rs.getString("cuenta"),rs.getString("numero"),
                                rs.getString("resultado"),rs.getString("motivo"),campos);
                    } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                        throw new org.springframework.dao.DataRetrievalFailureException("No se pudo leer la comparación de la factura.",e);
                    }
                }).list();
        return new PageImpl<>(cambios,page,total);
    }

    private String key(Factura f) {return f.cuenta()+"\u0000"+f.numero();}
    private void incidencia(UUID cargaId,Fila row,IncidenciaResultado resultado,String codigo,String mensaje) {
        cargas.incidencia(cargaId,row.numeroFila(),row.datos().get("inmueble"),resultado,codigo,mensaje,mapper.valueToTree(row.datos()));
    }
    @Transactional(readOnly=true)
    public Page<Detalle> detalle(UUID cargaId,Pageable page) {
        cargas.obtener(cargaId);
        long count=jdbc.sql("select count(*) from factura_carga_detalle where carga_id=?").param(cargaId).query(Long.class).single();
        var rows=jdbc.sql("select * from factura_carga_detalle where carga_id=? order by fila limit ? offset ?")
            .params(cargaId,Math.min(page.getPageSize(),500),page.getOffset()).query((rs,n)->new Detalle(rs.getInt("fila"),rs.getString("cuenta"),rs.getString("numero"),
                rs.getObject("periodo",LocalDate.class),rs.getBoolean("plan_pago"),rs.getBoolean("pagado"),rs.getObject("fecha_pago",LocalDate.class),rs.getBigDecimal("importe"),rs.getString("resultado"),rs.getString("codigo_caudalimetro"),rs.getObject("fecha_emision",LocalDate.class),rs.getObject("fecha_vencimiento",LocalDate.class))).list();
        return new PageImpl<>(rows,page,count);
    }
}
