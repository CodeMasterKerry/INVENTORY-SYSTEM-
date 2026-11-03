import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link aria-label="Sales Portal home" className="inline-flex items-center gap-2 font-semibold text-slate-950" href={href}>
      <span aria-hidden="true" className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm text-white">
        S
      </span>
      <span>Sales Portal</span>
    </Link>
  );
}
