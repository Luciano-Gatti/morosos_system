import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useId } from "react";

export const conceptOptions = [
  { value: "NORMAL", label: "Consumos" },
  { value: "PLAN", label: "Planes de pago" },
  { value: "OTROS", label: "Otros" },
];
export const paymentOptions = [
  { value: "EN_TERMINO", label: "En término" },
  { value: "FUERA_TERMINO", label: "Fuera de término" },
  { value: "SIN_FECHA", label: "Sin vencimiento informado" },
];

export function ReportMultiFilter({ label, description, options, selected, onChange }: {
  label: string; description: string; options: { value: string; label: string }[];
  selected: string[]; onChange: (values: string[]) => void;
}) {
  const all = options.every(o => selected.includes(o.value));
  const id = useId();
  const summary = all ? "Todos" : selected.length === 0 ? "Ninguno" : selected.length === 1
    ? options.find(o => o.value === selected[0])?.label : `${selected.length} seleccionados`;
  return <div className="min-w-0 space-y-1">
    <label htmlFor={id} className="text-sm font-medium">{label}</label>
    <Popover>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" className="h-9 w-full justify-between gap-2 bg-background px-3 font-normal" title={options.filter(o=>selected.includes(o.value)).map(o=>o.label).join(", ")}>
          <span className="truncate">{summary}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] p-3" aria-label={label}>
    <p className="mb-3 text-xs text-muted-foreground">{description}</p>
    <div className="flex flex-col gap-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <Checkbox checked={all ? true : selected.length ? "indeterminate" : false}
          onCheckedChange={() => onChange(all ? [] : options.map(o => o.value))} /> Todos
      </label>
      {options.map(o => <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={selected.includes(o.value)} onCheckedChange={checked =>
          onChange(checked ? [...selected, o.value] : selected.filter(v => v !== o.value))} />{o.label}
      </label>)}
    </div>
    {!selected.length && <p className="mt-3 text-xs text-muted-foreground">Ninguno seleccionado.</p>}
      </PopoverContent>
    </Popover>
  </div>;
}
