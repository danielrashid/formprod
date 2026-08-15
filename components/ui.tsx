import Link from "next/link";
import Image from "next/image";
import { logout } from "@/app/actions/auth";
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export type UserRole = "admin" | "editor" | "agente";

export function Logo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="DF-Legal"
        width={429}
        height={582}
        priority
        className="h-9 w-auto rounded-lg object-contain"
      />
      {!small && (
        <div className="leading-tight">
          <p className="text-base font-bold tracking-tight text-white">DF-Legal</p>
          <p className="text-[11px] font-medium text-white/70">
            Levantamento social
          </p>
        </div>
      )}
    </div>
  );
}

interface AppShellProps {
  title: string;
  subtitle?: string;
  user: { full_name: string; role: string; secretaria?: string };
  nav: { href: string; label: string; icon: typeof Home; active: boolean }[];
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, user, nav, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-br from-slate-900 via-primary-dark to-primary text-white shadow-lg">
        <div className="mx-auto max-w-xl px-4 pt-4 pb-5">
          <div className="flex items-center justify-between gap-3">
            <Logo />
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold leading-tight">{user.full_name}</p>
                <p className="text-xs capitalize text-white/70">
                  {user.role}
                  {user.secretaria ? ` · ${user.secretaria}` : ""}
                </p>
              </div>
              <div className="grid size-10 place-items-center rounded-full bg-white/15 text-sm font-bold uppercase ring-2 ring-white/20">
                {user.full_name.slice(0, 1)}
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  title="Sair"
                  className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                >
                  <LogOut className="size-5" />
                </button>
              </form>
            </div>
          </div>
          <div className="mt-4 sm:hidden">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-white/70">{subtitle}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-stretch justify-around px-2 py-1.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition ${
                item.active
                  ? "text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function NavItem(
  href: string,
  label: string,
  icon: typeof Home,
  active: boolean
) {
  return { href, label, icon, active };
}

export const ICONS = { Home, ClipboardList, LayoutDashboard, ShieldCheck };

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="hidden sm:block">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-surface shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "blue";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-success-soft text-success",
    amber: "bg-warning-soft text-warning",
    blue: "bg-primary-soft text-primary",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface-muted px-6 py-10 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted">{description}</p>}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
