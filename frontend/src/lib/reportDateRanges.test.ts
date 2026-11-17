import { describe, it, expect } from "vitest";
import { reportDateRange } from "./reportDateRanges";
describe("rangos del reporte", () => {
  it("incluye siete días contando hoy y cruza de año", () => {
    expect(reportDateRange("7d", new Date(2026,0,3))).toEqual({desde:"2025-12-28",hasta:"2026-01-03"});
  });
  it("ajusta el último mes al fin de febrero", () => {
    expect(reportDateRange("1m", new Date(2026,2,31))).toEqual({desde:"2026-02-28",hasta:"2026-03-31"});
  });
  it("el historial completo no usa una fecha de inicio inventada", () => {
    expect(reportDateRange("all", new Date(2026,10,10))).toEqual({desde:"INICIO",hasta:"2026-11-10"});
  });
});
