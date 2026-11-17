package pe.morosos.importacion.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.text.Normalizer;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.morosos.audit.service.AuditService;
import pe.morosos.common.api.ErrorResponse;
import pe.morosos.common.exception.ResourceNotFoundException;
import pe.morosos.common.exception.ValidationException;
import pe.morosos.distrito.entity.Distrito;
import pe.morosos.distrito.repository.DistritoRepository;
import pe.morosos.grupo.entity.Grupo;
import pe.morosos.grupo.repository.GrupoRepository;
import pe.morosos.grupodistrito.repository.GrupoDistritoConfigRepository;
import pe.morosos.importacion.dto.ImportacionInmuebleErrorResponse;
import pe.morosos.importacion.dto.ImportacionInmuebleResponse;
import pe.morosos.importacion.entity.ImportacionEstado;
import pe.morosos.importacion.entity.ImportacionInmueble;
import pe.morosos.importacion.entity.ImportacionInmuebleError;
import pe.morosos.importacion.mapper.ImportacionInmuebleMapper;
import pe.morosos.importacion.parser.CsvRowParser;
import pe.morosos.importacion.parser.ExcelRowParser;
import pe.morosos.importacion.repository.ImportacionInmuebleErrorRepository;
import pe.morosos.importacion.repository.ImportacionInmuebleRepository;
import pe.morosos.inmueble.entity.Inmueble;
import pe.morosos.inmueble.repository.InmuebleRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImportacionInmuebleService {
    private static final String ERROR_ACTIVO_INVALIDO = "Valor inválido para columna activo. Valores permitidos: true/false, si/no, 1/0, activo/inactivo, alta/baja.";
    private static final Set<String> ACTIVO_TRUE_VALUES = new HashSet<>(List.of("true", "si", "s", "1", "activo", "alta"));
    private static final Set<String> ACTIVO_FALSE_VALUES = new HashSet<>(List.of("false", "no", "n", "0", "inactivo", "baja"));

    private final ImportacionInmuebleRepository repo;
    private final ImportacionInmuebleErrorRepository errRepo;
    private final InmuebleRepository inmuebleRepo;
    private final GrupoRepository grupoRepo;
    private final DistritoRepository distritoRepo;
    private final GrupoDistritoConfigRepository gdcRepo;
    private final CsvRowParser csvParser;
    private final ExcelRowParser excelParser;
    private final ImportacionInmuebleMapper mapper;
    private final ObjectMapper objectMapper;
    private final AuditService auditService;

    @Transactional
    public ImportacionInmuebleResponse importar(MultipartFile file) {
        log.info("Iniciando importación de inmuebles: archivo='{}', size={} bytes", file != null ? file.getOriginalFilename() : null, file != null ? file.getSize() : 0);
        ImportacionInmueble imp = new ImportacionInmueble();
        imp.setArchivoNombre(file.getOriginalFilename());
        imp.setEstado(ImportacionEstado.PROCESANDO);
        imp.setTotalRegistros(0);
        imp.setProcesados(0);
        imp.setCreados(0);
        imp.setActualizados(0);
        imp.setSinCambios(0);
        imp.setErrores(0);
        imp = repo.save(imp);
        auditService.log("IMPORTACION_INMUEBLE", imp.getId(), "INICIO_IMPORTACION", null, null, "/api/v1/inmuebles/importaciones", null, null);

        String filename = file != null ? file.getOriginalFilename() : "";
        String extension = obtenerExtension(filename);
        log.info("Importación de inmuebles {}: nombre archivo='{}', extensión detectada='{}'", imp.getId(), filename, extension);
        List<Map<String, String>> rows = parseRowsByExtension(file, extension);
        log.info("Importación de inmuebles {}: filas leídas={}", imp.getId(), rows.size());

        imp.setTotalRegistros(rows.size());
        int fila = 1;
        for (Map<String, String> r : rows) {
            fila++;
            String cuenta = r.getOrDefault("cuenta", "");
            try {
                if (cuenta.isBlank() || r.getOrDefault("titular", "").isBlank() || r.getOrDefault("direccion", "").isBlank()) throw new IllegalArgumentException("Faltan campos obligatorios");
                Grupo g = resolverGrupo(r.getOrDefault("grupo", ""));
                Distrito d = resolverDistrito(r.getOrDefault("distrito", ""));
                if (!gdcRepo.existsByGrupoIdAndDistritoId(g.getId(), d.getId())) {
                    throw new IllegalArgumentException("El distrito existe pero no está asociado al grupo");
                }
                Optional<Inmueble> opt = inmuebleRepo.findByCuentaIgnoreCase(cuenta);
                Inmueble in = opt.orElseGet(Inmueble::new);
                boolean created = opt.isEmpty();
                boolean activo = parseActivo(r);
                boolean seguimientoHabilitado = r.containsKey("seguimiento_habilitado")
                        && !r.get("seguimiento_habilitado").isBlank()
                        ? Boolean.parseBoolean(r.get("seguimiento_habilitado"))
                        : created || in.isSeguimientoHabilitado();
                String direccion = direccionPadron(r);
                String beneficio = beneficioPadron(r, in.getBeneficioCuenta());
                String observacion = r.containsKey("observacion") ? trimToNull(r.get("observacion")) : in.getObservacion();
                boolean unchanged = !created
                        && same(in.getTitular(), r.get("titular"))
                        && same(in.getDireccion(), direccion)
                        && same(in.getBeneficioCuenta(), beneficio)
                        && in.getGrupo().getId().equals(g.getId())
                        && in.getDistrito().getId().equals(d.getId())
                        && in.isActivo() == activo
                        && in.isSeguimientoHabilitado() == seguimientoHabilitado
                        && same(in.getObservacion(), observacion);
                if (unchanged) {
                    imp.setProcesados(imp.getProcesados() + 1);
                    imp.setSinCambios(imp.getSinCambios() + 1);
                    continue;
                }
                in.setCuenta(cuenta);
                if (created && "150-999999-999".equals(cuenta)) in.setEsPrueba(true);
                in.setTitular(r.get("titular"));
                in.setDireccion(direccion);
                in.setBeneficioCuenta(beneficio);
                in.setGrupo(g);
                in.setDistrito(d);
                in.setActivo(activo);
                in.setSeguimientoHabilitado(seguimientoHabilitado);
                in.setObservacion(observacion);
                inmuebleRepo.save(in);
                imp.setProcesados(imp.getProcesados() + 1);
                if (created) imp.setCreados(imp.getCreados() + 1);
                else imp.setActualizados(imp.getActualizados() + 1);
            } catch (Exception ex) {
                ImportacionInmuebleError e = new ImportacionInmuebleError();
                e.setImportacion(imp);
                e.setFila(fila);
                e.setCuenta(cuenta.isBlank() ? null : cuenta);
                e.setMotivo(ex.getMessage());
                e.setPayload(objectMapper.valueToTree(r));
                errRepo.save(e);
                imp.setErrores(imp.getErrores() + 1);
            }
        }
        imp.setEstado(imp.getProcesados() == 0 ? ImportacionEstado.FALLIDA : (imp.getErrores() > 0 ? ImportacionEstado.COMPLETADA_CON_ERRORES : ImportacionEstado.COMPLETADA));
        imp = repo.save(imp);
        log.info("Finalizó importación de inmuebles {}: filas leídas={}, inmuebles guardados={}, creados={}, actualizados={}, errores={}, estado={}",
                imp.getId(), imp.getTotalRegistros(), imp.getProcesados(), imp.getCreados(), imp.getActualizados(), imp.getErrores(), imp.getEstado());
        auditService.log("IMPORTACION_INMUEBLE", imp.getId(), "FIN_IMPORTACION", null, null, "/api/v1/inmuebles/importaciones", null, objectMapper.valueToTree(Map.of("procesados", imp.getProcesados(), "errores", imp.getErrores(), "estado", imp.getEstado().name())));
        return mapper.toResponse(imp);
    }

    private List<Map<String, String>> parseRowsByExtension(MultipartFile file, String extension) {
        List<String> requiredHeaders = List.of("cuenta", "titular", "direccion", "grupo", "distrito");
        return switch (extension) {
            case "csv" -> {
                log.info("Parser seleccionado: CsvRowParser");
                yield csvParser.parse(file, requiredHeaders);
            }
            case "xlsx", "xls" -> {
                log.info("Parser seleccionado: ExcelRowParser");
                yield excelParser.parse(file, requiredHeaders);
            }
            default -> throw new ValidationException("Formato inválido", List.of(new ErrorResponse.Detail("file", "Extensión no soportada: " + extension + ". Use .csv, .xlsx o .xls")));
        };
    }

    private String obtenerExtension(String filename) {
        if (filename == null || filename.isBlank() || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    static String beneficioPadron(Map<String,String> row, String anterior) {
        if (!row.containsKey("descuento")) return anterior;
        String valor = Normalizer.normalize(row.get("descuento"), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
        Set<String> beneficios = new HashSet<>();
        for (String etiqueta : valor.split("[,;]")) {
            String nombre = etiqueta.trim().replaceFirst("^desc(?:uento)?[.]?\\s+", "").trim();
            switch (nombre) {
                case "jubilado", "jubilados" -> beneficios.add("Jubilados");
                case "discapacidad", "por discapacidad" -> beneficios.add("Discapacidad");
                case "tarifa social" -> beneficios.add("Tarifa social");
                default -> { } // El padrón también incluye descuentos ajenos a estos tres beneficios.
            }
        }
        if (beneficios.size() > 1) throw new IllegalArgumentException("La cuenta informa más de un beneficio: " + beneficios);
        return beneficios.stream().findFirst().orElse(null);
    }

    static String direccionPadron(Map<String,String> row) {
        String direccion = row.get("direccion");
        if (!row.containsKey("calle") || !row.get("calle").equals(direccion)) return direccion;
        StringBuilder completa = new StringBuilder(direccion);
        agregarParte(completa, "", row.get("altura"));
        agregarParte(completa, " Mza.", row.get("manzana"));
        agregarParte(completa, " Piso", row.get("piso"));
        agregarParte(completa, " Dpto/Casa", row.get("dpto/casa"));
        return completa.toString();
    }

    private static void agregarParte(StringBuilder direccion, String etiqueta, String valor) {
        if (valor != null && !valor.isBlank() && !valor.equals("-")) direccion.append(etiqueta).append(' ').append(valor);
    }

    static boolean parseActivo(Map<String, String> row) {
        if (!row.containsKey("activo")) return true;
        String raw = row.get("activo");
        if (raw == null || raw.isBlank()) return true;

        String normalized = Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);

        if (ACTIVO_TRUE_VALUES.contains(normalized)) return true;
        if (ACTIVO_FALSE_VALUES.contains(normalized)) return false;
        throw new IllegalArgumentException(ERROR_ACTIVO_INVALIDO);
    }

    private Grupo resolverGrupo(String valorExcelRaw) {
        String valorExcel = valorExcelRaw == null ? "" : valorExcelRaw.trim();
        String codigoGenerado = generarCodigo(valorExcel);
        log.info("Resolviendo grupo: valorExcel='{}', codigoGenerado='{}'", valorExcel, codigoGenerado);
        return grupoRepo.findByNombreIgnoreCase(valorExcel)
                .or(() -> grupoRepo.findByCodigoIgnoreCase(codigoGenerado))
                .orElseThrow(() -> new IllegalArgumentException(
                        "Grupo no existe: " + valorExcel + ". Código buscado: " + codigoGenerado));
    }

    private Distrito resolverDistrito(String valorExcelRaw) {
        String valorExcel = valorExcelRaw == null ? "" : valorExcelRaw.trim();
        String codigoGenerado = generarCodigo(valorExcel);
        log.info("Resolviendo distrito: valorExcel='{}', codigoGenerado='{}'", valorExcel, codigoGenerado);
        return distritoRepo.findByNombreIgnoreCase(valorExcel)
                .or(() -> distritoRepo.findByCodigoIgnoreCase(codigoGenerado))
                .orElseThrow(() -> new IllegalArgumentException(
                        "Distrito no existe: " + valorExcel + ". Código buscado: " + codigoGenerado));
    }

    private String generarCodigo(String nombre) {
        if (nombre == null || nombre.isBlank()) return "";
        String normalized = Normalizer.normalize(nombre.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");
        return normalized;
    }

    private static boolean same(String left, String right) {
        return java.util.Objects.equals(trimToNull(left), trimToNull(right));
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Transactional(readOnly = true)
    public ImportacionInmuebleResponse get(UUID id) {
        return mapper.toResponse(repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Importación no encontrada")));
    }

    @Transactional(readOnly = true)
    public Page<ImportacionInmuebleErrorResponse> errores(UUID id, Pageable p) {
        if (!repo.existsById(id)) throw new ResourceNotFoundException("Importación no encontrada");
        return errRepo.findByImportacionId(id, p).map(mapper::toErrorResponse);
    }
}
