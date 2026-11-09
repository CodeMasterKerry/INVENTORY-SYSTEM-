"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useMounted } from "@/lib/hooks";
import { portalPath } from "@/lib/utils";
import type { LoginResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { toast } from "@/components/ui/toast";

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
    if (!email || !password) return setError("Enter your email address and password.");
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
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_50%_30%,#ffffff_0%,#f4f8ff_58%,#fffaf3_100%)] px-5 py-10">
      <header className="mb-10 text-center">
        <div className="flex justify-center"><Logo /></div>
        <p className="mt-3 font-serif text-base text-slate-600">Smart Inventory &amp; Sale Management System</p>
      </header>

      <section className="w-full max-w-[572px] rounded-[18px] border border-white bg-white px-6 py-7 shadow-[0_16px_40px_rgba(39,77,122,0.14)] sm:px-8 sm:py-7">
        <div className="text-center">
          <h1 className="font-serif text-[30px] font-bold leading-tight text-slate-950">Welcome Back</h1>
          <p className="mt-3 font-serif text-base text-slate-500">Enter your credentials to access your account</p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
          <Input
            label="Email address"
            name="email"
            type="text"
            autoComplete="username"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            trailing={
              <button
                type="button"
                onClick={() => setShow((visible) => !visible)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
          />
          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-14 w-full rounded-lg font-serif text-base" loading={loading}>
            Sign In
          </Button>
        </form>
      </section>

      <p className="mt-10 text-center font-serif text-sm text-slate-500">
        © 2026 E-SIMS · Smart Inventory Management
      </p>
    </main>
  );
}
