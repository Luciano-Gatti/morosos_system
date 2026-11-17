import { format, subDays, subMonths, subYears } from "date-fns";
export type ReportRange = "7d" | "1m" | "6m" | "1y" | "all" | "custom";
export function reportDateRange(range: Exclude<ReportRange, "custom">, today = new Date()) {
  const start = range === "7d" ? subDays(today, 6) : range === "1m" ? subMonths(today, 1) : range === "6m" ? subMonths(today, 6) : subYears(today, 1);
  return { desde: range === "all" ? "INICIO" : format(start, "yyyy-MM-dd"), hasta: format(today, "yyyy-MM-dd") };
}
