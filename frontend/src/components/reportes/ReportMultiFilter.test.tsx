import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useState } from "react";
import { ReportMultiFilter, conceptOptions } from "./ReportMultiFilter";
afterEach(cleanup);
it("permite combinar opciones, seleccionar todas y dejar ninguna", () => {
  function Fixture() {
    const [selected,setSelected]=useState(["NORMAL"]);
    return <ReportMultiFilter label="Tipos" description="Filtro" options={conceptOptions} selected={selected} onChange={setSelected} />;
  }
  render(<Fixture />);
  expect(screen.queryByRole("checkbox")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Tipos"}));
  expect(screen.getByRole("checkbox",{name:"Todos"}).getAttribute("aria-checked")).toBe("mixed");
  fireEvent.click(screen.getByRole("checkbox",{name:"Planes de pago"}));
  expect(screen.getByRole("checkbox",{name:"Consumos"}).getAttribute("aria-checked")).toBe("true");
  fireEvent.click(screen.getByRole("checkbox",{name:"Todos"}));
  expect(screen.getAllByRole("checkbox").every(c=>c.getAttribute("aria-checked")==="true")).toBe(true);
  fireEvent.click(screen.getByRole("checkbox",{name:"Todos"}));
  expect(screen.getAllByRole("checkbox").every(c=>c.getAttribute("aria-checked")==="false")).toBe(true);
});
