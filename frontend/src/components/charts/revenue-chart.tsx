"use client";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

const compact = (v: number) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(v);

export function RevenueChart({ data }: { data: { date: string; revenue: number }[] }) {
  if (data.every((d) => d.revenue === 0)) {
    return <EmptyState icon={BarChart3} title="No approved sales in this period" description="Revenue appears here once sales are approved." />;
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2a4fcc" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#2a4fcc" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e4e7ec" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={compact} />
          <Tooltip
            formatter={(v) => [formatCurrency(Number(v)), "Revenue"]}
            contentStyle={{ borderRadius: 8, border: "1px solid #e4e7ec", fontSize: 12, boxShadow: "none" }}
          />
          <Area type="monotone" dataKey="revenue" stroke="#2a4fcc" strokeWidth={2} fill="url(#revFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}