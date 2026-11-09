"use client";
import { useMemo } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Boxes, CheckCircle2, Clock3, PackageX, ShoppingBag, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { ManagerDashboard, Product } from "@/types";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";
import { SalesList } from "./parts";
import { fetchSales } from "@/features/sales/api";

async function fetchDashboard() {
  const [dashboard, sales, products] = await Promise.all([
    api<ManagerDashboard>("/dashboard/manager"),
    fetchSales(),
    api<Product[]>("/products"),
  ]);
  return { dashboard, sales, products };
}

export function ManagerDashboardView() {
  const { data, error, loading, reload } = useFetch(fetchDashboard);
  const recentSales = useMemo(
    () => [...(data?.sales ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [data]
  );
  const sales = data?.sales ?? [];
  const products = data?.products ?? [];
  const approvedCount = sales.filter((sale) => sale.status === "APPROVED").length;
  const pendingCount = sales.filter((sale) => sale.status === "PENDING").length;
  const rejectedCount = sales.filter((sale) => sale.status === "REJECTED").length;
  const reviewCount = approvedCount + pendingCount + rejectedCount;
  const approvalRate = reviewCount ? Math.round((approvedCount / reviewCount) * 100) : 0;
  const approvedProducts = products.filter((product) => product.isApproved);
  const healthyProducts = approvedProducts.filter((product) => product.quantity > product.lowStockLevel).length;
  const stockHealth = approvedProducts.length ? Math.round((healthyProducts / approvedProducts.length) * 100) : 0;
  const d = data?.dashboard;

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      <PageHeader title="Manager Dashboard" description="Here’s your business overview." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={!data} label="Total Revenue" value={formatCurrency(d?.revenue ?? 0)} icon={Wallet} tone="success" hint="From approved sales" />
        <KpiCard loading={!data} label="Pending Approvals" value={formatNumber(d?.pendingSales ?? 0)} icon={Clock3} tone="warning" hint="Require your attention" />
        <KpiCard loading={!data} label="Total Sales" value={formatNumber(d?.approvedSales ?? 0)} icon={ShoppingBag} hint="Approved transactions" />
        <KpiCard loading={!data} label="Low Stock Items" value={formatNumber(d?.lowStockCount ?? 0)} icon={PackageX} tone="danger" hint={`Of ${formatNumber(d?.totalProducts ?? 0)} products`} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
        <Card>
          <CardHeader
            title="Recent Sales"
            description="Latest transactions across all sales officers"
            action={<Link href="/manager/sales" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">View all</Link>}
          />
          {loading && !data ? (
            <div className="space-y-3 p-5">{[0, 1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : (
            <SalesList sales={recentSales} showOfficer empty="No sales have been submitted yet." />
          )}
        </Card>

        <Card>
          <CardHeader title="Quick Stats" description="Key metrics at a glance" />
          <div className="space-y-5 p-5">
            <StatBar label="Approval Rate" value={approvalRate} color="bg-amber-400" />
            <StatBar label="Stock Health" value={stockHealth} color="bg-emerald-500" />
            <div className="border-t border-line pt-4">
              <p className="mb-3 text-[13px] font-semibold text-slate-900">Sales Overview</p>
              <div className="space-y-2.5 text-[13px]">
                <StatLine label="Approved sales" value={formatNumber(approvedCount)} icon={CheckCircle2} tone="text-emerald-600" />
                <StatLine label="Pending approvals" value={formatNumber(pendingCount)} icon={Clock3} tone="text-amber-600" />
                <StatLine label="Rejected sales" value={formatNumber(rejectedCount)} icon={ArrowDownRight} tone="text-red-600" />
                <StatLine label="Active products" value={formatNumber(approvedProducts.length)} icon={Boxes} tone="text-brand-600" />
              </div>
            </div>
            <Link href="/manager/inventory/products" className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2.5 text-[13px] font-medium text-brand-700 hover:bg-brand-100">
              <span className="flex items-center gap-2"><ArrowUpRight className="size-4" />Manage inventory</span>
              <span>{formatNumber(approvedProducts.length)} products</span>
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[13px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatLine({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof CheckCircle2; tone: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600"><Icon className={`size-4 ${tone}`} />{label}</span>
      <span className="font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}
