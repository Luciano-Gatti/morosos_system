import { useState } from "react";
import { AreaChart, Area, Tooltip, XAxis, ResponsiveContainer } from "recharts";

export interface TrendPoint { date: string; value: number | null }
interface Props {
  title: string;
  value: string;
  detail: string;
  trend?: TrendPoint[];
  color?: string;
  formatValue?: (value: number | null) => string;
}

export function ReportKpi({ title, value, detail, trend = [], color = "#0d9488", formatValue = String }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const selected = activeIndex === null ? undefined : trend[activeIndex];
  return <div className="min-w-0 rounded-2xl border bg-surface p-5 shadow-sm" onMouseLeave={() => setActiveIndex(null)}>
    <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
    <p className="mt-3 break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{selected ? formatValue(selected.value) : value}</p>
    <p className="mt-2 min-h-4 text-xs text-muted-foreground">{selected ? `${selected.date} · ${selected.date.length === 7 ? "Valor del mes" : "Valor del día"}` : detail}</p>
    {trend.length > 0 && <div className="mt-4 h-12" role="img" aria-label={`Tendencia de ${title}. Pasá el cursor para consultar fecha y valor. El detalle también está disponible en las tablas del reporte.`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trend} margin={{top:5,bottom:5,left:5,right:5}}
          onMouseMove={state => {
            const index = state?.activeTooltipIndex;
            setActiveIndex(state?.isTooltipActive && typeof index === "number" && index >= 0 && index < trend.length ? index : null);
          }}
          onMouseLeave={() => setActiveIndex(null)}>
          <XAxis dataKey="date" hide />
          <Tooltip content={() => null} cursor={{stroke:color, strokeDasharray:"3 3", strokeOpacity:0.6}} />
          <Area type="linear" dataKey="value" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.08}
            dot={trend.length === 1 ? {r:3,fill:color} : false}
            activeDot={{r:4,fill:color,stroke:"hsl(var(--surface))",strokeWidth:2}} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>}
  </div>;
}
