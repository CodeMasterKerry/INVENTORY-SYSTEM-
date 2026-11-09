"use client";

import { cn } from "@/lib/utils";

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last-week"
  | "last-month"
  | "last-7-days"
  | "this-month"
  | "custom";

export interface DateFilterValue {
  preset: DatePreset;
  from: string;
  to: string;
  comparePrevious: boolean;
}

export const initialDateFilter: DateFilterValue = {
  preset: "all",
  from: "",
  to: "",
  comparePrevious: false,
};

const dateClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
const presets: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last-7-days", label: "Last 7 days" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "custom", label: "Custom" },
];

export function DateFilter({
  value,
  onChange,
  showCompare = false,
}: {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  showCompare?: boolean;
}) {
  const canCompare = value.preset !== "all" && (value.preset !== "custom" || (!!value.from && !!value.to));

  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-card sm:p-5">
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          aria-pressed={value.preset === "all"}
          onClick={() => onChange({ ...value, preset: "all", from: "", to: "", comparePrevious: false })}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            value.preset === "all"
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-line bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          )}
        >
          All time
        </button>
        {presets.map(({ value: preset, label }) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value.preset === preset}
            onClick={() =>
              onChange({
                ...value,
                preset,
                from: "",
                to: "",
                comparePrevious: preset === "all" ? false : value.comparePrevious,
              })
            }
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              value.preset === preset
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-line bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {showCompare && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4">
          <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              role="switch"
              checked={value.comparePrevious}
              disabled={!canCompare}
              onChange={(event) => onChange({ ...value, comparePrevious: event.target.checked })}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                "relative h-6 w-11 rounded-full bg-slate-200 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 peer-checked:bg-brand-600 peer-checked:after:translate-x-5",
                !canCompare && "cursor-not-allowed opacity-50"
              )}
            />
            Compare with the previous period
          </label>
          {!canCompare && <span className="text-xs text-slate-400">Select a date range first.</span>}
        </div>
      )}
      {value.preset === "custom" && (
        <div className="mt-4 grid max-w-2xl gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium text-slate-700">From</span>
            <input
              type="date"
              className={dateClass}
              value={value.from}
              max={value.to || undefined}
              onChange={(event) => onChange({ ...value, from: event.target.value })}
              aria-label="Custom date from"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[13px] font-medium text-slate-700">To</span>
            <input
              type="date"
              className={dateClass}
              value={value.to}
              min={value.from || undefined}
              onChange={(event) => onChange({ ...value, to: event.target.value })}
              aria-label="Custom date to"
            />
          </label>
        </div>
      )}
    </div>
  );
}

function dayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function resolveDateRange(value: DateFilterValue, now = new Date()) {
  if (value.preset === "all") return { start: null, end: null };
  if (value.preset === "custom") {
    return {
      start: value.from ? new Date(`${value.from}T00:00:00`) : null,
      end: value.to ? new Date(`${value.to}T23:59:59.999`) : null,
    };
  }

  const today = dayStart(now);
  if (value.preset === "today") return { start: today, end: dayEnd(today) };
  if (value.preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: yesterday, end: dayEnd(yesterday) };
  }
  if (value.preset === "this-month") {
    return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: dayEnd(today) };
  }
  if (value.preset === "last-month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999),
    };
  }

  const start = new Date(today);
  start.setDate(start.getDate() - (value.preset === "last-week" || value.preset === "last-7-days" ? 6 : 29));
  return { start, end: dayEnd(today) };
}

export function dateRangeParams(start: Date | null, end: Date | null, dateField = "createdAt") {
  const params = new URLSearchParams();
  if (start) params.set("from", start.toISOString());
  if (end) params.set("to", end.toISOString());
  if (start || end) params.set("dateField", dateField);
  return params;
}

export function dateFilterParams(value: DateFilterValue, dateField = "createdAt") {
  const { start, end } = resolveDateRange(value);
  return dateRangeParams(start, end, dateField);
}

export function resolvePreviousDateRange(value: DateFilterValue, now = new Date()) {
  const current = resolveDateRange(value, now);
  if (!current.start || !current.end || value.preset === "all") return null;
  if (value.preset === "last-month") {
    const start = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1);
    const end = new Date(current.start.getFullYear(), current.start.getMonth(), 0, 23, 59, 59, 999);
    return { start, end };
  }

  const duration = current.end.getTime() - current.start.getTime() + 1;
  const end = new Date(current.start.getTime() - 1);
  const start = new Date(end.getTime() - duration + 1);
  return { start, end };
}

export function isInDateRange(date: string | Date, value: DateFilterValue) {
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return false;
  const { start, end } = resolveDateRange(value);
  return (!start || time >= start.getTime()) && (!end || time <= end.getTime());
}

export function isInPreviousDateRange(date: string | Date, value: DateFilterValue) {
  const time = new Date(date).getTime();
  if (!Number.isFinite(time)) return false;
  const range = resolvePreviousDateRange(value);
  return !!range && time >= range.start.getTime() && time <= range.end.getTime();
}
