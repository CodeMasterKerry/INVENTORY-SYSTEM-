"use client";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import type { Category } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ErrorState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { toast } from "@/components/ui/toast";
import { AwaitingNotice } from "@/components/ui/awaiting-backend";
import { inventoryTabs, ModuleTabs } from "@/components/layout/module-tabs";
import { fetchCategoriesPage } from "@/features/inventory/api";

export default function CategoriesPage() {
  const { data, error, loading, reload } = useFetch(fetchCategoriesPage);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const m = new Map<number, number>();
    (data?.products ?? []).forEach((p) => m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1));
    return m;
  }, [data]);

  const columns: Column<Category>[] = [
    { key: "name", header: "Category", sortValue: (c) => c.name.toLowerCase(), render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
    { key: "count", header: "Products", align: "right", sortValue: (c) => counts.get(c.id) ?? 0, render: (c) => counts.get(c.id) ?? 0 },
  ];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter a category name");
    setSaving(true);
    try {
      await api("/categories", { method: "POST", body: { name: name.trim() } });
      toast.success("Category created");
      setName("");
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
    } finally {
      setSaving(false);
    }
  }

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group products for easier tracking."
        actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" />New category</Button>}
      />
      <ModuleTabs items={inventoryTabs} label="Inventory" />
      <AwaitingNotice title="Rename and delete are not available yet">
        The backend currently supports listing and creating categories only.
      </AwaitingNotice>
      <DataTable columns={columns} rows={data?.categories ?? []} rowKey={(c) => c.id} loading={loading && !data} emptyTitle="No categories yet" emptyDescription="Create a category before adding products." />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title="New category"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="cat-form" loading={saving}>Create</Button>
          </>
        }
      >
        <form id="cat-form" onSubmit={create}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </form>
      </Modal>
    </>
  );
}