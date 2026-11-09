"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { PosView } from "@/features/pos/pos-view";
import { SalesView } from "./sales-view";

type WorkspaceTab = "create" | "history";

export function OfficerSalesWorkspace({ initialTab = "history" }: { initialTab?: WorkspaceTab }) {
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);

  return (
    <>
      <PageHeader title="My Sales" description="Create sales and review your submitted transactions in one workspace." />
      <div role="tablist" aria-label="My Sales workspace" className="mb-6 flex gap-1 border-b border-line">
        {([
          ["create", "Create Sale"],
          ["history", "Sales History"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === value
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <section role="tabpanel" aria-label={tab === "create" ? "Create sale" : "Sales history"}>
        {tab === "create" ? (
          <PosView showHeader={false} />
        ) : (
          <SalesView
            role="SALES_OFFICER"
            title="Sales History"
            description="Review invoices, products, quantities and approval status."
            showHeader={false}
          />
        )}
      </section>
    </>
  );
}
