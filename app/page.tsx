import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell, NavItem, Badge, SectionTitle, Card } from "@/components/ui";
import {
  ClipboardList,
  ClipboardPen,
  Home,
  LayoutDashboard,
  Settings2,
  Users,
  ArrowRight,
  PlusCircle,
  Map,
} from "lucide-react";
import type { UserRole } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, secretaria_id, secretarias(nome, sigla)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  type ProfileHome = {
    id: string;
    full_name: string;
    role: string;
    secretaria_id: string | null;
    secretarias: { nome: string; sigla: string } | null;
  };
  const profileData = profile as unknown as ProfileHome;

  const role = (profileData.role ?? "agente") as UserRole;
  const secretaria = profileData.secretarias?.nome;

  const { count: minhasEntrevistas } = await supabase
    .from("entrevistas")
    .select("id", { count: "exact", head: true })
    .eq("agente_id", profileData.id);

  const roleLabel: Record<UserRole, string> = {
    admin: "Administrador",
    editor: "Editor de perguntas",
    agente: "Agente de campo",
  };

  const nav = [
    NavItem("/", "Início", Home, true),
    NavItem("/entrevistas", "Entrevistas", ClipboardList, false),
    NavItem("/mapa", "Mapa", Map, false),
    ...(role !== "agente"
      ? [NavItem("/painel", "Painel", LayoutDashboard, false)]
      : []),
    ...(role === "admin"
      ? [NavItem("/admin", "Admin", Settings2, false)]
      : []),
  ];

  const quickActions =
    role === "agente"
      ? [
          {
            href: "/entrevistas",
            title: "Nova entrevista",
            description: "Iniciar levantamento com formulário",
            icon: PlusCircle,
            tone: "from-primary to-primary-dark",
          },
          {
            href: "/entrevistas",
            title: "Minhas entrevistas",
            description: `${minhasEntrevistas ?? 0} registros`,
            icon: ClipboardList,
            tone: "from-accent to-teal-700",
          },
        ]
      : role === "editor"
        ? [
            {
              href: "/gerenciar-perguntas",
              title: "Editar perguntas",
              description: "Formulário da sua secretaria",
              icon: ClipboardPen,
              tone: "from-primary to-primary-dark",
            },
            {
              href: "/painel",
              title: "Acompanhar",
              description: "Entrevistas da secretaria",
              icon: LayoutDashboard,
              tone: "from-accent to-teal-700",
            },
            {
              href: "/mapa",
              title: "Mapa de pessoas",
              description: "Localizar cadastros e ir até o ponto",
              icon: Map,
              tone: "from-slate-700 to-slate-900",
            },
          ]
        : [
            {
              href: "/admin",
              title: "Área do Administrador",
              description: "Secretarias, perfis e acessos",
              icon: Users,
              tone: "from-primary to-primary-dark",
            },
            {
              href: "/painel",
              title: "Painel geral",
              description: "Entrevistas de todas as secretarias",
              icon: LayoutDashboard,
              tone: "from-accent to-teal-700",
            },
            {
              href: "/gerenciar-perguntas",
              title: "Perguntas",
              description: "Editar formulários",
              icon: ClipboardPen,
              tone: "from-slate-700 to-slate-900",
            },
            {
              href: "/mapa",
              title: "Mapa de pessoas",
              description: "Localizar cadastros e ir até o ponto",
              icon: Map,
              tone: "from-slate-800 to-slate-950",
            },
          ];

  return (
    <AppShell
      title="Início"
      user={{
        full_name: profileData.full_name,
        role: roleLabel[role],
        secretaria,
      }}
      nav={nav}
    >
      <section className="mb-6">
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-primary-dark to-primary p-5 text-white shadow-card">
          <p className="text-sm font-medium text-white/70">
            Bem-vindo(a), {profileData.full_name.split(" ")[0]}
          </p>
          <h2 className="mt-1 text-lg font-bold">
            {role === "agente"
              ? "Pronto para realizar o levantamento?"
              : role === "editor"
                ? "Formulário pronto para revisão"
                : "Serviço integrado - Monitora DF"}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="blue">
              <span className="text-slate-500">Perfil:</span>
              <span className="font-semibold text-slate-900">{roleLabel[role]}</span>
            </Badge>
            {secretaria && (
              <Badge tone="blue">
                <span className="text-slate-500">Secretaria:</span>
                <span className="font-semibold text-slate-900">{secretaria}</span>
              </Badge>
            )}
          </div>
        </div>
      </section>

      <SectionTitle>Acesso rápido</SectionTitle>
      <div className="grid grid-cols-1 gap-3">
        {quickActions.map((action) => (
          <a key={action.title} href={action.href} className="group">
            <Card className="flex items-center gap-4 p-4 transition group-hover:shadow-card-hover">
              <div
                className={`grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${action.tone} text-white shadow-md`}
              >
                <action.icon className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{action.title}</p>
                <p className="text-sm text-muted">{action.description}</p>
              </div>
              <ArrowRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Card>
          </a>
        ))}
      </div>

      {role === "agente" && (
        <section className="mt-8">
          <SectionTitle>Dica</SectionTitle>
          <Card className="border-l-4 border-accent p-4">
            <p className="text-sm leading-relaxed text-muted">
              Durante a entrevista, o formulário solicita a <b>localização GPS</b>{" "}
              automaticamente. Garanta que o celular esteja com a localização
              ativada.
            </p>
          </Card>
        </section>
      )}
    </AppShell>
  );
}
