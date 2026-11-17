package pe.morosos.cargas.facturas;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.ResolverStyle;
import java.text.Normalizer;
import java.util.*;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import pe.morosos.common.exception.ValidationException;

@Component
public class FacturaExcelParser {
    public record Fila(int numeroFila, Map<String,String> datos, boolean caudalimetro) {
        public Fila(int numeroFila, Map<String,String> datos) { this(numeroFila, datos, false); }
    }
    public record Candidato(int fila, String cuenta, String numero, String periodo, String estado, String importe) {}
    public record Factura(String cuenta, String numero, LocalDate periodo, boolean planPago,
                          boolean pagado, LocalDate fechaPago, BigDecimal importe,
                          BigDecimal neto, BigDecimal iva, BigDecimal descuentos, String beneficio, String codigoCaudalimetro, LocalDate fechaEmision, LocalDate fechaVencimiento) {
        public Factura(String cuenta, String numero, LocalDate periodo, boolean planPago, boolean pagado, LocalDate fechaPago, BigDecimal importe, BigDecimal neto, BigDecimal iva, BigDecimal descuentos, String beneficio, String codigoCaudalimetro) {
            this(cuenta,numero,periodo,planPago,pagado,fechaPago,importe,neto,iva,descuentos,beneficio,codigoCaudalimetro,null,null);
        }
        public BigDecimal facturado() { return neto == null ? null : neto.add(iva).subtract(descuentos); }
    }
    private static final List<String> REQUIRED = List.of("num factura", "inmueble", "periodo", "estado", "fecha de pago", "importe a cobrar");
    private static final List<String> BILLING = List.of("importe neto", "iva", "importe descuentos");
    public List<Fila> leer(MultipartFile file) {
        if (file == null || file.isEmpty()) throw invalid("Seleccioná un archivo Excel con facturas.");
        try (var stream = file.getInputStream(); var wb = WorkbookFactory.create(stream)) {
            if (wb.getNumberOfSheets() == 0) throw invalid("El archivo no tiene hojas.");
            var sheet = wb.getSheetAt(0);
            var formatter = new DataFormatter(Locale.ROOT);
            Row header = sheet.getRow(0);
            if (header == null) throw invalid("Falta la fila de encabezados.");
            Map<String,Integer> columns = new LinkedHashMap<>();
            for (Cell cell : header) {
                String name = normalize(formatter.formatCellValue(cell));
                if (!name.isBlank() && columns.put(name,cell.getColumnIndex()) != null) throw invalid("Encabezado duplicado: " + name);
            }
            for (String name : REQUIRED) if (!columns.containsKey(name)) throw invalid("Falta la columna: " + name);
            long billingColumns = BILLING.stream().filter(columns::containsKey).count();
            if (billingColumns > 0 && billingColumns < 3) throw invalid("Para facturación se necesitan Importe Neto, IVA e Importe Descuentos.");
            List<String> selected = new ArrayList<>(REQUIRED);
            if (billingColumns == 3) selected.addAll(BILLING);
            if (columns.containsKey("descuentos")) selected.add("descuentos");
            for (String fecha : List.of("fecha de emision", "fecha de vencimiento")) if (columns.containsKey(fecha)) selected.add(fecha);
            List<Fila> rows = new ArrayList<>();
            for (int n=1;n<=sheet.getLastRowNum();n++) {
                Row row=sheet.getRow(n); if (row==null) continue;
                Map<String,String> values=new LinkedHashMap<>();
                for (String name:selected) {
                    Cell cell=row.getCell(columns.get(name));
                    String value=cell==null ? "" : formatter.formatCellValue(cell).trim();
                    if (cell!=null && cell.getCellType()==CellType.NUMERIC) {
                        if (name.startsWith("fecha de ") && DateUtil.isCellDateFormatted(cell)) value=cell.getLocalDateTimeCellValue().toLocalDate().toString();
                        else if ((name.equals("importe a cobrar") || BILLING.contains(name))) value=BigDecimal.valueOf(cell.getNumericCellValue()).toPlainString();
                        else if (name.equals("num factura")) value=BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
                    }
                    values.put(name,value);
                }
                if (values.values().stream().anyMatch(v->!v.isBlank())) rows.add(new Fila(n+1,values));
            }
            if(rows.isEmpty()) throw invalid("El archivo no contiene facturas.");
            return rows;
        } catch (ValidationException e) { throw e; }
          catch (Exception e) { throw invalid("No se pudo leer el Excel. Verificá que sea un archivo .xlsx o .xls válido."); }
    }
    private static LocalDate periodoMensual(String valor) {
        if (!valor.matches("(?:0?[1-9]|1[0-2])/[0-9]{4}")) return null;
        String[] partes = valor.split("/");
        return LocalDate.of(Integer.parseInt(partes[1]),Integer.parseInt(partes[0]),1);
    }

    private static boolean esCandidato(String valor) {
        return !valor.isBlank() && valor.length() <= 100 && !valor.equals("/") && periodoMensual(valor) == null;
    }

    public List<Candidato> candidatos(List<Fila> filas) {
        return filas.stream().filter(f -> esCandidato(f.datos().get("periodo")))
                .map(f -> new Candidato(f.numeroFila(), f.datos().get("inmueble"), f.datos().get("num factura"),
                        f.datos().get("periodo"), f.datos().get("estado"), f.datos().get("importe a cobrar"))).toList();
    }

    public List<Fila> aplicarSeleccion(List<Fila> filas, Set<Integer> seleccion) {
        if (seleccion == null || seleccion.isEmpty()) return filas;
        var pendientes = new HashSet<>(seleccion);
        var resultado = new ArrayList<Fila>(filas.size());
        for (Fila fila : filas) {
            if (pendientes.remove(fila.numeroFila())) {
                if (!esCandidato(fila.datos().get("periodo"))) throw invalid("La fila " + fila.numeroFila() + " no es candidata.");
                resultado.add(new Fila(fila.numeroFila(),fila.datos(),true));
            } else resultado.add(fila);
        }
        if (!pendientes.isEmpty()) throw invalid("La selección no corresponde a las filas del archivo.");
        return resultado;
    }

    public Factura convertir(Fila fila) {
        var d=fila.datos(); String cuenta=d.get("inmueble"), numero=d.get("num factura");
        if(cuenta.isBlank() || cuenta.length()>50 || numero.isBlank() || numero.length()>100) throw invalid("Cuenta o número de factura inválido.");
        String raw=d.get("periodo");
        boolean plan=raw.equals("/");
        LocalDate periodo=periodoMensual(raw);
        String codigoCaudalimetro=null;
        if (!plan && periodo == null) {
            if (fila.caudalimetro() && esCandidato(raw)) codigoCaudalimetro=raw;
            else throw invalid("Período inválido: " + raw + ". La fila no fue aceptada como cuota de caudalímetro.");
        }
        String estado=normalize(d.get("estado"));
        if(!estado.equals("pagado") && !estado.equals("no pagado")) throw invalid("Estado inválido: " + d.get("estado"));
        boolean pagado=estado.equals("pagado"); LocalDate fecha=null; String date=d.get("fecha de pago");
        if(!date.isBlank()) {
            try { fecha=date.matches("[0-9]{4}-.*") ? LocalDate.parse(date) : LocalDate.parse(date,DateTimeFormatter.ofPattern("dd-MM-uuuu").withResolverStyle(ResolverStyle.STRICT)); }
            catch(Exception e) {throw invalid("Fecha de pago inválida: " + date);}
        }
        if(pagado && fecha==null) throw invalid("La factura pagada debe tener fecha de pago.");
        if(!pagado && fecha!=null) throw invalid("La factura no pagada tiene fecha de pago. Revisá el estado.");
        BigDecimal importe = money(d.get("importe a cobrar"), "Importe a cobrar");
        BigDecimal neto=null, iva=null, descuentos=null;
        if (BILLING.stream().anyMatch(d::containsKey)) {
            neto=money(d.get("importe neto"),"Importe Neto");
            iva=money(d.get("iva"),"IVA");
            descuentos=money(d.get("importe descuentos"),"Importe Descuentos");
            BigDecimal total=neto.add(iva).subtract(descuentos);
            if(total.signum()<0 || total.precision()>18) throw invalid("El importe facturado calculado es inválido.");
        }
        LocalDate emision = fechaOpcional(d.get("fecha de emision"), "Fecha de emisión");
        LocalDate vencimiento = fechaOpcional(d.get("fecha de vencimiento"), "Fecha de vencimiento");
        if (emision != null && vencimiento != null && vencimiento.isBefore(emision)) throw invalid("El vencimiento es anterior a la emisión.");
        return new Factura(cuenta,numero,periodo,plan,pagado,fecha,importe,neto,iva,descuentos,beneficio(d.get("descuentos")),codigoCaudalimetro,emision,vencimiento);
    }
    private static LocalDate fechaOpcional(String raw, String campo) {
        if (raw == null || raw.isBlank() || raw.equals("-")) return null;
        try { return raw.matches("[0-9]{4}-.*") ? LocalDate.parse(raw) : LocalDate.parse(raw.replace('/','-'),DateTimeFormatter.ofPattern("dd-MM-uuuu").withResolverStyle(ResolverStyle.STRICT)); }
        catch(Exception e) { throw invalid(campo + " inválida: " + raw); }
    }
    private static String beneficio(String raw) {
        if (raw == null) return null;
        String value = normalize(raw);
        if (value.contains("jubilad") || value.contains("jubilac")) return "Jubilados";
        if (value.contains("discapaci")) return "Discapacidad";
        if (value.contains("tarifa social")) return "Tarifa social";
        return null;
    }
    private BigDecimal money(String raw, String field) {
        try {
            if(raw==null || raw.isBlank()) throw new IllegalArgumentException();
            String amount=raw.replace("$", "").replace(" ", "");
            if(amount.contains(",")) {
                if(!amount.matches("-?(?:[0-9]+|[0-9]{1,3}(?:\\.[0-9]{3})+),[0-9]{1,2}")) throw new IllegalArgumentException();
                amount=amount.replace(".", "").replace(",", ".");
            }
            BigDecimal value=new BigDecimal(amount).setScale(2,RoundingMode.UNNECESSARY);
            if(value.signum()<0 || value.precision()>18) throw new IllegalArgumentException();
            return value;
        } catch(Exception e) {throw invalid(field + " inválido: " + raw);}
    }
    private static String normalize(String s) {return Normalizer.normalize(s,Normalizer.Form.NFD).replaceAll("\\p{M}", "").trim().toLowerCase(Locale.ROOT).replaceAll("\\s+"," ");}
    private static ValidationException invalid(String message) {return new ValidationException(message,null);}
}
