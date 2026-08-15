"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, LogIn, ShieldCheck, MapPin, Users } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha inválidos."
          : error.message
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-900">
      <div className="relative flex flex-1 flex-col justify-center overflow-hidden px-5 py-10">
        <div className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image
              src="/logo.png"
              alt="DF-Legal"
              width={429}
              height={582}
              priority
              className="mb-4 h-28 w-auto drop-shadow-xl"
            />
            <h1 className="text-3xl font-bold tracking-tight text-white">DF-Legal</h1>
            <p className="mt-1 text-sm text-white/60">
              Governo do Distrito Federal
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  E-mail
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
                    <Users className="size-4" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="voce@secretaria.gov.br"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Senha
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-400">
                    <ShieldCheck className="size-4" />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-slate-50 py-2.5 pl-9 pr-11 text-sm text-foreground placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-primary focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" />
                    Entrar
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-white/50">
            <span className="flex items-center gap-1.5 text-xs">
              <MapPin className="size-3.5" /> GPS
            </span>
            <span className="h-3 w-px bg-white/20" />
            <span className="flex items-center gap-1.5 text-xs">
              <Users className="size-3.5" /> Perfis por secretaria
            </span>
            <span className="h-3 w-px bg-white/20" />
            <span className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="size-3.5" /> Seguro
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
