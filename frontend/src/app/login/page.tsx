"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Eye, EyeOff, History, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useMounted } from "@/lib/hooks";
import { portalPath } from "@/lib/utils";
import type { LoginResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { toast } from "@/components/ui/toast";

const points = [
  { icon: ShieldCheck, title: "Role-based access", text: "Managers and sales officers each get a portal built for their work." },
  { icon: ClipboardCheck, title: "Prepare and approve", text: "Every sale is reviewed before stock moves or revenue is recorded." },
  { icon: History, title: "Complete audit trail", text: "Each stock movement is logged, so nothing changes without a record." },
];

export default function LoginPage() {
  const router = useRouter();
  const mounted = useMounted();
  const { token, user, setSession } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mounted && token && user) router.replace(portalPath(user.role));
  }, [mounted, token, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Enter your email and password.");
    setLoading(true);
    try {
      const res = await api<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setSession(res.token, res.user);
      toast.success(`Welcome back, ${res.user.name.split(" ")[0]}`);
      router.replace(portalPath(res.user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div
        className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-12 lg:flex"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      >
        <Logo light />
        <div className="max-w-md">
          <h1 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-white">
            Inventory and sales, under control.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-400">
            One system for stock, sales approvals and financial reporting, with accountability built into every step.
          </p>
          <ul className="mt-10 space-y-6">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/[0.07] text-brand-300">
                  <Icon className="size-[18px]" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="mt-0.5 text-[13px] text-slate-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">© {mounted && new Date().getFullYear()} E-SIMS</p>
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">Use the account provided by your manager.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />
            {error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}