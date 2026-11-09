"use client";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { Skeleton } from "./skeleton";
import { EmptyState } from "./empty-state";
import { Button } from "./button";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  hideOnMobile?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  pageSize = 10,
  toolbar,
  emptyTitle = "No results",
  emptyDescription,
  emptyAction,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  pageSize?: number;
  toolbar?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const col = sort ? columns.find((c) => c.key === sort.key) : null;
    if (!sort || !col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.dir === "asc" ? r : -r;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  function toggleSort(key: string) {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <Card className="overflow-hidden">
      {toolbar && <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">{toolbar}</div>}

      {loading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead className="bg-slate-50/70">
                <tr>
                  {columns.map((c) => {
                    const active = sort?.key === c.key;
                    return (
                      <th
                        key={c.key}
                        className={cn(
                          "whitespace-nowrap px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500",
                          c.align === "right" && "text-right",
                          c.hideOnMobile && "hidden md:table-cell"
                        )}
                      >
                        {c.sortValue ? (
                          <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase hover:text-slate-800">
                            {c.header}
                            {active ? (
                              sort!.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-50" />
                            )}
                          </button>
                        ) : (
                          c.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={rowKey(row)} className="border-t border-line transition-colors hover:bg-slate-50/70">
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          "px-4 py-3 text-sm text-slate-700",
                          c.align === "right" && "text-right tabular-nums",
                          c.hideOnMobile && "hidden md:table-cell"
                        )}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-slate-500">
            <span className="tabular-nums">
              {start + 1}–{Math.min(start + pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 tabular-nums">
                {current} / {pages}
              </span>
              <Button variant="secondary" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)} aria-label="Next page">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}