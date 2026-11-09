"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

const PALETTE = ["#1a2a56", "#2a4fcc", "#5c86f5", "#8fb0ff", "#94a3b8", "#cbd5e1"];

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyState icon={PieIcon} title="No inventory yet" description="Add approved products with stock to see the split." />;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="size-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => formatCurrency(Number(v))}
              contentStyle={{ borderRadius: 8, border: "1px solid #e4e7ec", fontSize: 12, boxShadow: "none" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2">
        {data.slice(0, 6).map((d, i) => (
          <li key={d.name} className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2 text-slate-700">
              <span className="size-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              {d.name}
            </span>
            <span className="tabular-nums text-slate-500">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}