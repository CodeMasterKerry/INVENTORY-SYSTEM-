"use client";
import { useCallback, useMemo, useState } from "react";
import { Calculator, Hourglass, Pencil, Percent, Plus, Receipt, RefreshCw, Trash2, TrendingUp, Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatDate, formatNumber, formatPaymentMethod, toNumber } from "@/lib/utils";
import { comparisonSummary, revenueByDateRange } from "@/lib/analytics";
import type { Expense, IncomeTransaction } from "@/types";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { DateFilter, dateRangeParams, initialDateFilter, isInDateRange, isInPreviousDateRange, resolveDateRange, resolvePreviousDateRange, type DateFilterValue } from "@/components/ui/date-filter";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { fetchSales } from "@/features/sales/api";
import { ExpenseFormModal } from "./expense-form-modal";

const fetchBundle = async (dateFilter: DateFilterValue) => {
  const current = resolveDateRange(dateFilter);
  const previous = dateFilter.comparePrevious ? resolvePreviousDateRange(dateFilter) : null;
  const incomeFrom = previous && current.start && previous.start < current.start ? previous.start : previous?.start ?? current.start;
  const incomeQuery = dateRangeParams(incomeFrom, current.end).toString();
  const expenseQuery = dateOnlyRangeParams(incomeFrom, current.end).toString();
  const [approved, pending, rejected, income, expenses] = await Promise.all([
    fetchSales({ status: "APPROVED", from: incomeFrom, to: current.end, dateField: "approvedAt" }),
    fetchSales({ status: "PENDING", from: current.start, to: current.end, dateField: "createdAt" }),
    fetchSales({ status: "REJECTED", from: current.start, to: current.end, dateField: "rejectedAt" }),
    api<IncomeTransaction[]>(`/finance/income${incomeQuery ? `?${incomeQuery}` : ""}`),
    api<Expense[]>(`/finance/expenses${expenseQuery ? `?${expenseQuery}` : ""}`),
  ]);
  return {
    sales: [...new Map([...approved, ...pending, ...rejected].map((sale) => [sale.id, sale])).values()],
    income,
    expenses,
  };
};

function dateOnlyRangeParams(start: Date | null, end: Date | null) {
  const params = new URLSearchParams();
  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (start) params.set("from", dateKey(start));
  if (end) params.set("to", dateKey(end));
  return params;
}

function isExpenseDateInRange(value: string, dateFilter: DateFilterValue, previous = false) {
  const { start, end } = previous
    ? resolvePreviousDateRange(dateFilter) ?? { start: null, end: null }
    : resolveDateRange(dateFilter);
  const date = value.slice(0, 10);
  const dateKey = (item: Date) => `${item.getFullYear()}-${String(item.getMonth() + 1).padStart(2, "0")}-${String(item.getDate()).padStart(2, "0")}`;
  return (!start || date >= dateKey(start)) && (!end || date <= dateKey(end));
}

const iconButtonClass = "rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800";

export function FinanceView() {
  const [query, setQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(initialDateFilter);
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const loadBundle = useCallback(() => fetchBundle(dateFilter), [dateFilter]);
  const { data, error, loading, reload } = useFetch(loadBundle);
  const sales = useMemo(() => data?.sales ?? [], [data]);
  const income = useMemo(
    () => (data?.income ?? [])
      .filter((entry) => isInDateRange(entry.createdAt, dateFilter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [data, dateFilter]
  );
  const expenses = useMemo(
    () => (data?.expenses ?? []).filter((expense) => isExpenseDateInRange(expense.expenseDate, dateFilter)),
    [data, dateFilter]
  );
  const incomeRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? income.filter((entry) => entry.sale.invoiceNo.toLowerCase().includes(term) || entry.sale.createdBy.name.toLowerCase().includes(term))
      : income;
  }, [income, query]);
  const trend = useMemo(() => revenueByDateRange(sales, dateFilter), [sales, dateFilter]);
  const pending = useMemo(
    () => sales.filter((sale) => sale.status === "PENDING" && isInDateRange(sale.createdAt, dateFilter)),
    [sales, dateFilter]
  );
  const pendingValue = pending.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
  const incomeValue = income.reduce((sum, entry) => sum + toNumber(entry.amount), 0);
  const expenseValue = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const netIncome = incomeValue - expenseValue;
  const vatCollected = income.reduce((sum, entry) => sum + toNumber(entry.sale.taxAmount), 0);
  const previousRangeAvailable = dateFilter.comparePrevious && !!resolvePreviousDateRange(dateFilter);
  const previousIncome = previousRangeAvailable
    ? (data?.income ?? [])
      .filter((entry) => isInPreviousDateRange(entry.createdAt, dateFilter))
      .reduce((sum, entry) => sum + toNumber(entry.amount), 0)
    : 0;
  const previousExpenses = previousRangeAvailable
    ? (data?.expenses ?? [])
      .filter((expense) => isExpenseDateInRange(expense.expenseDate, dateFilter, true))
      .reduce((sum, expense) => sum + toNumber(expense.amount), 0)
    : 0;
  const profit = income.reduce(
    (sum, entry) => sum + entry.sale.items.reduce(
      (lineSum, item) => lineSum + (item.unitCost === null
        ? 0
        : (toNumber(item.unitPrice) - toNumber(item.unitCost)) * item.quantity),
      0
    ) - toNumber(entry.sale.discountAmount),
    0
  );
  const unknownCostLines = income.reduce(
    (count, entry) => count + entry.sale.items.filter((item) => item.unitCost === null).length,
    0
  );

  async function deleteExpense() {
    if (!deletingExpense) return;
    setDeleting(true);
    try {
      await api(`/finance/expenses/${deletingExpense.id}`, { method: "DELETE" });
      toast.success("Expense deleted");
      setDeletingExpense(null);
      await reload();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not delete expense");
    } finally {
      setDeleting(false);
    }
  }

  const incomeColumns: Column<IncomeTransaction>[] = [
    { key: "date", header: "Recorded", sortValue: (entry) => new Date(entry.createdAt).getTime(), render: (entry) => <span className="whitespace-nowrap">{formatDate(entry.createdAt, true)}</span> },
    { key: "invoice", header: "Invoice", sortValue: (entry) => entry.sale.invoiceNo, render: (entry) => <span className="font-mono text-[13px] font-medium text-slate-900">{entry.sale.invoiceNo}</span> },
    { key: "prepared", header: "Prepared by", hideOnMobile: true, render: (entry) => entry.sale.createdBy.name },
    { key: "approved", header: "Approved by", hideOnMobile: true, render: (entry) => entry.sale.approvedBy?.name ?? "—" },
    { key: "payment", header: "Payment method", hideOnMobile: true, render: (entry) => formatPaymentMethod(entry.sale.paymentMethod) },
    { key: "amount", header: "Income (excl. VAT)", align: "right", sortValue: (entry) => toNumber(entry.amount), render: (entry) => <span className="font-medium text-emerald-700">+{formatCurrency(entry.amount)}</span> },
    { key: "vat", header: "VAT collected", align: "right", hideOnMobile: true, sortValue: (entry) => toNumber(entry.sale.taxAmount), render: (entry) => formatCurrency(entry.sale.taxAmount) },
  ];

  const expenseColumns: Column<Expense>[] = [
    { key: "date", header: "Date", sortValue: (expense) => new Date(expense.expenseDate).getTime(), render: (expense) => <span className="whitespace-nowrap">{formatDate(`${expense.expenseDate.slice(0, 10)}T12:00:00`)}</span> },
    { key: "category", header: "Category", sortValue: (expense) => expense.category.toLowerCase(), render: (expense) => <span className="font-medium text-slate-900">{expense.category}</span> },
    { key: "description", header: "Description", render: (expense) => expense.description },
    { key: "createdBy", header: "Recorded by", hideOnMobile: true, render: (expense) => expense.createdBy?.name ?? "—" },
    { key: "amount", header: "Amount", align: "right", sortValue: (expense) => toNumber(expense.amount), render: (expense) => <span className="font-medium text-red-700">−{formatCurrency(expense.amount)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (expense) => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" className={iconButtonClass} title="Edit expense" aria-label={`Edit ${expense.category} expense`} onClick={() => { setEditingExpense(expense); setFormOpen(true); }}><Pencil className="size-4" /></button>
          <button type="button" className="rounded-md p-1.5 text-red-600 hover:bg-red-50" title="Delete expense" aria-label={`Delete ${expense.category} expense`} onClick={() => setDeletingExpense(expense)}><Trash2 className="size-4" /></button>
        </div>
      ),
    },
  ];

  if (error && !data) return <Card><ErrorState message={error} onRetry={() => void reload()} /></Card>;

  const waiting = !data;
  return (
    <>
      <PageHeader
        title="Analysis"
        description="Net income excludes VAT and expenses. Pending and rejected sales are never counted."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void reload()} disabled={loading}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />
      <div className="mb-5"><DateFilter value={dateFilter} onChange={setDateFilter} showCompare /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard loading={waiting} label="Period Income" value={formatCurrency(incomeValue)} icon={Wallet} tone="success" hint={previousRangeAvailable ? comparisonSummary(incomeValue, previousIncome) : "Approved sales only"} />
        <KpiCard loading={waiting} label="Period Expenses" value={formatCurrency(expenseValue)} icon={Receipt} tone="warning" />
        <KpiCard loading={waiting} label="Net Income" value={formatCurrency(netIncome)} icon={TrendingUp} tone={netIncome < 0 ? "danger" : "brand"} hint={previousRangeAvailable ? comparisonSummary(netIncome, previousIncome - previousExpenses) : "Income minus recorded expenses"} />
        <KpiCard loading={waiting} label="Period Gross Profit" value={formatCurrency(profit)} icon={TrendingUp} tone="success" hint={unknownCostLines ? `Partial: missing historical cost for ${unknownCostLines} item line${unknownCostLines === 1 ? "" : "s"}` : "Selling price minus saved historical cost"} />
        <KpiCard loading={waiting} label="VAT Collected" value={formatCurrency(vatCollected)} icon={Percent} tone="brand" hint="From approved sales" />
        <KpiCard loading={waiting} label="Approved Transactions" value={formatNumber(income.length)} icon={Calculator} />
        <KpiCard loading={waiting} label="Average Sale" value={formatCurrency(income.length ? incomeValue / income.length : 0)} icon={Calculator} />
        <KpiCard loading={waiting} label="Awaiting Approval" value={formatCurrency(pendingValue)} icon={Hourglass} tone="warning" hint="Not counted as income" />
        <KpiCard loading={waiting} label="Rejected Sales" value={formatNumber(sales.filter((sale) => sale.status === "REJECTED" && isInDateRange(sale.rejectedAt ?? sale.createdAt, dateFilter)).length)} icon={Receipt} tone="danger" />
      </div>
      <Card className="mt-4">
        <CardHeader title="Income trend" description="Approved sale income in selected date range" />
        <div className="p-4">{waiting ? <div className="h-64 animate-pulse rounded-md bg-slate-100" /> : <RevenueChart data={trend} />}</div>
      </Card>
      <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Income records</h2>
      </div>
      <DataTable
        columns={incomeColumns}
        rows={incomeRows}
        rowKey={(entry) => entry.id}
        loading={loading && !data}
        toolbar={<SearchInput value={query} onChange={setQuery} placeholder="Search invoice or officer…" />}
        emptyTitle="No income recorded yet"
        emptyDescription="Income appears here when a sale is approved."
      />
      <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Expenses</h2>
          <p className="mt-1 text-[13px] text-slate-500">Recorded business expenses for the selected period.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingExpense(null); setFormOpen(true); }}><Plus className="size-4" />Record expense</Button>
      </div>
      <DataTable
        columns={expenseColumns}
        rows={expenses}
        rowKey={(expense) => expense.id}
        loading={loading && !data}
        emptyTitle="No expenses recorded"
        emptyDescription="Add an expense to include it in net income."
      />
      <ExpenseFormModal
        key={formOpen ? editingExpense?.id ?? "new" : "closed"}
        open={formOpen}
        expense={editingExpense}
        onClose={() => setFormOpen(false)}
        onDone={reload}
      />
      <Modal
        open={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        title="Delete expense?"
        description={deletingExpense ? `Delete ${deletingExpense.category}: ${deletingExpense.description}? This cannot be undone.` : undefined}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setDeletingExpense(null)} disabled={deleting}>Cancel</Button>
            <Button type="button" variant="danger" onClick={() => void deleteExpense()} loading={deleting}>Delete expense</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">The expense will be removed from this period’s totals.</p>
      </Modal>
    </>
  );
}
