import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import LogoutButton from "@/components/logout-button";
import UsersTable from "@/components/admin/users-table";
import StatsCards from "@/components/admin/stats-cards";
import AssistantConfigForm from "@/components/admin/assistant-config-form";

export default async function AdminPage() {
  const { user, profile } = await requireAdmin();

  return (
    <main className="min-h-screen bg-[#faf9f6] text-[#202820]">
      <header className="flex items-center justify-between border-b border-[#e8e5dd] px-6 py-4 md:px-12">
        <Link href="/" className="text-lg font-bold">
          AI Expert Chat
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-[#39765a] transition hover:text-[#245747]"
          >
            ← Volver al inicio
          </Link>

          <LogoutButton />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <p className="text-sm font-medium text-[#39765a]">
          Área administrativa
        </p>

        <h1 className="mt-3 text-3xl font-bold">Panel de administración</h1>

        <div className="mt-8 rounded-2xl border border-[#e8e5dd] bg-white p-6">
          <h2 className="text-lg font-semibold">Administrador autenticado</h2>

          <p className="mt-4 text-sm">Nombre: {profile.full_name}</p>

          <p className="mt-2 text-sm">Correo: {user.email}</p>

          <p className="mt-2 text-sm">Rol: {profile.role}</p>
        </div>

        <StatsCards />

        <AssistantConfigForm />

        <UsersTable />
      </section>
    </main>
  );
}
