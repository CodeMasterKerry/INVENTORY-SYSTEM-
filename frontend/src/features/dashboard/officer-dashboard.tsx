"use client";
import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Boxes, ChartNoAxesColumn, Clock3, FileBarChart, Plus, Search, ShoppingCart } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { OfficerDashboard, Product } from "@/types";
import { useAuthStore } from "@/store/auth-store";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";
import { SalesList } from "./parts";
import { fetchSales } from "@/features/sales/api";

async function fetchDashboard() {
  const [dashboard, products, sales] = await Promise.all([
    api<OfficerDashboard>("/dashboard/officer"),
    api<Product[]>("/products"),
    fetchSales(),
  ]);
  return { dashboard, products, sales };
}

const actions = [
  { title: "New Sale", href: "/officer/new-sale", icon: Plus, tone: "primary" },
  { title: "View Products", href: "/officer/products", icon: Search, tone: "blue" },
  { title: "My Sales", href: "/officer/sales", icon: ShoppingCart, tone: "orange" },
  { title: "Reports", href: "/officer/reports", icon: FileBarChart, tone: "neutral" },
] as const;

export function OfficerDashboardView() {
  const user = useAuthStore((state) => state.user);
  const { data, error, loading, reload } = useFetch(fetchDashboard);
  const recentSales = useMemo(
    () => [...(data?.sales ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [data]
  );
  const d = data?.dashboard;
  const availableProducts = data?.products.filter((product) => product.isApproved && product.quantity > 0).length ?? 0;
  const totalSales = (d?.approvedSales ?? 0) + (d?.pendingSales ?? 0) + (d?.rejectedSales ?? 0);

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      <PageHeader title={`Welcome back, ${user?.name.split(" ")[0] ?? "there"}! 👋`} description="Here’s what’s happening with your sales today." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard loading={!data} label="Total Sales" value={formatNumber(totalSales)} icon={ShoppingCart} hint={`${formatNumber(d?.approvedSales ?? 0)} approved`} />
        <KpiCard loading={!data} label="Total Revenue" value={formatCurrency(d?.totalSold ?? 0)} icon={ArrowUpRight} tone="success" hint="From approved sales" />
        <KpiCard loading={!data} label="Pending Approval" value={formatNumber(d?.pendingSales ?? 0)} icon={Clock3} tone="warning" hint="Awaiting manager review" />
        <KpiCard loading={!data} label="Products Available" value={formatNumber(availableProducts)} icon={Boxes} tone="brand" hint="Ready to sell" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardHeader title="Quick Actions" description="Common tasks to get you started" action={<ChartNoAxesColumn className="size-4 text-slate-400" />} />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {actions.map(({ title, href, icon: Icon, tone }) => (
              <Link
                key={title}
                href={href}
                className={`flex min-h-[76px] items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                  tone === "primary"
                    ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
                    : tone === "blue"
                      ? "border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
                      : tone === "orange"
                        ? "border-orange-200 bg-white text-orange-600 hover:bg-orange-50"
                        : "border-line bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-3"><Icon className="size-5" /><span className="text-sm font-semibold">{title}</span></span>
                <ArrowUpRight className="size-4 opacity-70" />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent Activity" description="Your latest transactions" action={<Link href="/officer/sales" className="text-[13px] font-medium text-brand-600 hover:text-brand-700">View all</Link>} />
          {loading && !data ? (
            <div className="space-y-3 p-5">{[0, 1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : (
            <SalesList sales={recentSales} empty="No sales activity yet." />
          )}
        </Card>
      </div>
    </>
  );
}
