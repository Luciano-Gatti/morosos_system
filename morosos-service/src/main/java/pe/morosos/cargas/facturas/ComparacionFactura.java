package pe.morosos.cargas.facturas;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import pe.morosos.cargas.facturas.FacturaExcelParser.Factura;

final class ComparacionFactura {
    record Campo(String campo, String anterior, String informado, String vigente) {}

    static List<Campo> comparar(Factura anterior, Factura fuente, Factura vigente, boolean incluyeBeneficio) {
        if (anterior == null) return List.of();
        var campos = new ArrayList<Campo>();
        agregar(campos,"Estado de pago",estado(anterior),estado(fuente),estado(vigente));
        agregar(campos,"Fecha de pago",anterior.fechaPago(),fuente.fechaPago(),vigente.fechaPago());
        if (fuente.fechaEmision() != null) agregar(campos,"Fecha de emisión",anterior.fechaEmision(),fuente.fechaEmision(),vigente.fechaEmision());
        if (fuente.fechaVencimiento() != null) agregar(campos,"Fecha de vencimiento",anterior.fechaVencimiento(),fuente.fechaVencimiento(),vigente.fechaVencimiento());
        agregar(campos,"Importe a cobrar",anterior.importe(),fuente.importe(),vigente.importe());
        agregar(campos,"Período",periodo(anterior),periodo(fuente),periodo(vigente));
        if (fuente.neto() != null) {
            agregar(campos,"Importe neto",anterior.neto(),fuente.neto(),vigente.neto());
            agregar(campos,"IVA",anterior.iva(),fuente.iva(),vigente.iva());
            agregar(campos,"Descuento",anterior.descuentos(),fuente.descuentos(),vigente.descuentos());
            agregar(campos,"Importe facturado",anterior.facturado(),fuente.facturado(),vigente.facturado());
        }
        if (incluyeBeneficio) agregar(campos,"Beneficio",anterior.beneficio(),fuente.beneficio(),vigente.beneficio());
        return campos;
    }

    private static String estado(Factura f) { return f.pagado() ? "Pagado" : "No pagado"; }
    private static String periodo(Factura f) { if (f.codigoCaudalimetro() != null) return "Caudalímetro " + f.codigoCaudalimetro();
        return f.planPago() ? "Plan (/)" : f.periodo().toString(); }
    private static String texto(Object valor) {
        return valor instanceof BigDecimal monto ? monto.stripTrailingZeros().toPlainString() : Objects.toString(valor, null);
    }
    private static void agregar(List<Campo> campos,String nombre,Object anterior,Object informado,Object vigente) {
        if (!Objects.equals(texto(anterior), texto(informado))) {
            campos.add(new Campo(nombre,texto(anterior),texto(informado),texto(vigente)));
        }
    }
}
