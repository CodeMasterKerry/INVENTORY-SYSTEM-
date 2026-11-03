"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, Wallet, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { OfficerDashboard } from "@/types";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";

export default function OfficerOverview() {
  const [data, setData] = useState<OfficerDashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<OfficerDashboard>("/dashboard/officer")
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
      <PageHeader title="My Dashboard" description="Your sales performance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={loading} label="Total Sold" value={formatCurrency(data?.totalSold)} icon={Wallet} tone="success" hint="Approved sales only" />
        <KpiCard loading={loading} label="Approved Sales" value={formatNumber(data?.approvedSales)} icon={CheckCircle2} tone="success" />
        <KpiCard loading={loading} label="Pending Sales" value={formatNumber(data?.pendingSales)} icon={Clock} tone="warning" />
        <KpiCard loading={loading} label="Rejected Sales" value={formatNumber(data?.rejectedSales)} icon={XCircle} tone="danger" />
      </div>
    </>
  );
}