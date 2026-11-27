"use client";

import { useEffect, useState } from "react";

type AdminStats = {
  totalUsers: number;
  totalAdmins: number;
  totalEnabledUsers: number;
  totalDisabledUsers: number;
  totalConversations: number;
  totalMessages: number;
};

const statItems = [
  {
    key: "totalUsers",
    label: "Total de usuarios",
    description: "Usuarios registrados",
  },
  {
    key: "totalAdmins",
    label: "Administradores",
    description: "Usuarios con rol ADMIN",
  },
  {
    key: "totalEnabledUsers",
    label: "Cuentas habilitadas",
    description: "Usuarios con acceso activo",
  },
  {
    key: "totalDisabledUsers",
    label: "Cuentas deshabilitadas",
    description: "Usuarios sin acceso",
  },
  {
    key: "totalConversations",
    label: "Conversaciones",
    description: "Conversaciones registradas",
  },
  {
    key: "totalMessages",
    label: "Mensajes",
    description: "Mensajes almacenados",
  },
] as const;

export default function StatsCards() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/admin/stats");
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "No fue posible cargar las estadísticas.",
          );
        }

        setStats(data.stats);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al consultar las estadísticas.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <section className="mt-8">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Estadísticas generales</h2>
        <p className="mt-1 text-sm text-[#73766f]">
          Resumen de la actividad y los usuarios de la aplicación.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#e8e5dd] bg-white p-8 text-center text-sm text-[#73766f]">
          Cargando estadísticas...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statItems.map((item) => (
            <article
              key={item.key}
              className="rounded-2xl border border-[#e8e5dd] bg-white p-5"
            >
              <p className="text-sm font-medium text-[#73766f]">{item.label}</p>

              <p className="mt-3 text-3xl font-bold tabular-nums text-[#202820]">
                {stats[item.key].toLocaleString("es-CO")}
              </p>

              <p className="mt-2 text-xs text-[#92948d]">{item.description}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
