"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Datum = { label: string; value: number; tip: string };

export function BarChartCard({
  title,
  subtitle,
  data,
  percent = false,
}: {
  title: string;
  subtitle: string;
  data: Datum[];
  percent?: boolean;
}) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-muted">{subtitle}</p>
      <div className="chart h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine interval="preserveStartEnd" />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={percent ? [0, 1] : [0, "auto"]}
              tickFormatter={(v: number) => (percent ? `${Math.round(v * 100)}%` : String(v))}
            />
            <Tooltip
              cursor
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-sm">
                    <div className="font-medium">{(payload[0].payload as Datum).label}</div>
                    <div className="text-muted">{(payload[0].payload as Datum).tip}</div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
