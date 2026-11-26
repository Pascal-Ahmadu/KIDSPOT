"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FINANCE_SERIES, SERIES_COLORS } from "@/lib/chart-palette";
import { CURRENCY } from "@/lib/format";

const fmtMoney = new Intl.NumberFormat("en-NG", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });


type MonthPoint = { label: string; revenue: number; profit: number; cost: number };

/** Chart-01: multi-line chart on a light grid (values in minor units, shown in naira). */
export function FinanceLineChart({ data }: { data: MonthPoint[] }) {
  const rows = data.map((d) => ({ label: d.label, revenue: d.revenue / 100, profit: d.profit / 100, cost: d.cost / 100 }));
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#F1F1F1" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#525252" }} />
        <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12, fill: "#525252" }} tickFormatter={(v) => compact.format(v)} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #DCDCDC", fontSize: 12 }}
          formatter={(value, name) => [fmtMoney.format(Number(value)), FINANCE_SERIES.find((s) => s.key === name)?.label ?? String(name)]}
        />
        {FINANCE_SERIES.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Chart-07: concentric rounded rings (radial bars) showing each category's share, outermost = biggest. */
export function CategoryRadial({ data }: { data: { name: string; share: number }[] }) {
  // Recharts draws the first item innermost, so reverse to put the biggest share on the outside.
  const rows = data.map((d, i) => ({ ...d, fill: SERIES_COLORS[i % SERIES_COLORS.length] })).reverse();
  return (
    <div className="relative mx-auto h-[241px] w-[246px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={rows} innerRadius="28%" outerRadius="80%" startAngle={90} endAngle={-270} barSize={12}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="share" cornerRadius={16} background={{ fill: "#F1F1F1" }} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCDCDC", fontSize: 12 }} formatter={(v, _n, item) => [`${v}%`, (item?.payload as { name?: string })?.name ?? ""]} />
        </RadialBarChart>
      </ResponsiveContainer>
      {/* Scale labels around the rings (clockwise from the top) */}
      <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] leading-[18px] text-ink">0%</span>
      <span className="absolute right-0 top-[112px] text-[10px] leading-[18px] text-ink">25%</span>
      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] leading-[18px] text-ink">50%</span>
      <span className="absolute left-0 top-[112px] text-[10px] leading-[18px] text-ink">75%</span>
    </div>
  );
}

/** Chart-04 bar: light tint with a coloured outline on the top and sides (no bottom edge). */
function OutlinedBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill = "#525252" } = props;
  if (height <= 0 || width <= 0) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.14} />
      <path d={`M${x + 0.5},${y + height} V${y + 0.5} H${x + width - 0.5} V${y + height}`} fill="none" stroke={fill} strokeWidth={1} />
    </g>
  );
}

/** Chart-04: grouped bars, one group per month, one bar per category (values in minor units). */
export function CategoryBarChart({ months, series }: { months: { key: string; label: string }[]; series: { name: string; values: number[] }[] }) {
  const rows = months.map((m, i) => Object.fromEntries([["label", m.label], ...series.map((s, j) => [`c${j}`, s.values[i] / 100])]));
  return (
    <div className="h-[190px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={1} barCategoryGap="12%">
          <CartesianGrid stroke="#F1F1F1" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "#F1F1F1" }} tick={{ fontSize: 12, fill: "#525252" }} />
          <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 12, fill: "#525252" }} tickFormatter={(v) => compact.format(v)} />
          <Tooltip
            cursor={{ fill: "#F6F6F6" }}
            contentStyle={{ borderRadius: 8, border: "1px solid #DCDCDC", fontSize: 12 }}
            formatter={(value, name) => [fmtMoney.format(Number(value)), series[Number(String(name).slice(1))]?.name ?? String(name)]}
          />
          {series.map((s, j) => (
            <Bar key={s.name} dataKey={`c${j}`} fill={SERIES_COLORS[j % SERIES_COLORS.length]} maxBarSize={7} shape={<OutlinedBar />} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
