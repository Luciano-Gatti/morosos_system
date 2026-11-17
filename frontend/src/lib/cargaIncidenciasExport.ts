import type { CargaIncidencia } from "@/types/cargas";

const CSV_HEADERS = [
  "fila",
  "cuenta",
  "resultado",
  "codigo",
  "mensaje",
  "usuario",
  "fecha",
  "payload",
] as const;

export function incidenciasToCsv(rows: CargaIncidencia[]) {
  const lines = rows.map((row) => [
    row.fila ?? "",
    row.cuenta ?? "",
    row.resultado,
    row.codigo ?? "",
    row.mensaje,
    row.createdBy ?? "",
    row.createdAt,
    row.payload == null ? "" : JSON.stringify(row.payload),
  ].map(csvCell).join(","));
  return `\uFEFF${CSV_HEADERS.join(",")}\r\n${lines.join("\r\n")}`;
}

export function incidenciasToJson(rows: CargaIncidencia[]) {
  return JSON.stringify(rows, null, 2);
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
