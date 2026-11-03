"use client";
import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck, Package, PackageX, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { ManagerDashboard } from "@/types";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";

export default function ManagerOverview() {
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<ManagerDashboard>("/dashboard/manager")
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error)
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );

  const loading = !data;
  return (
    <>
      <PageHeader title="Overview" description="Business performance at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={loading} label="Total Revenue" value={formatCurrency(data?.revenue)} icon={Wallet} tone="success" hint="Approved sales only" />
        <KpiCard loading={loading} label="Pending Approvals" value={formatNumber((data?.pendingSales ?? 0) + (data?.pendingProducts ?? 0))} icon={ClipboardCheck} tone="warning" hint="Sales and product requests" />
        <KpiCard loading={loading} label="Total Products" value={formatNumber(data?.totalProducts)} icon={Package} />
        <KpiCard loading={loading} label="Low Stock Products" value={formatNumber(data?.lowStockCount)} icon={PackageX} tone="danger" />
      </div>
    </>
  );
}