"use client";

import { useEffect, useState } from "react";

type AdminUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: "ADMIN" | "USER";
  enabled: boolean;
  createdAt: string;
  conversationsCount: number;
};

type UpdateFields = {
  role?: "ADMIN" | "USER";
  enabled?: boolean;
};

type RowFeedback = {
  userId: string;
  message: string;
  success: boolean;
};

export default function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<RowFeedback | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("/api/admin/users");
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "No fue posible cargar los usuarios.",
          );
        }

        setUsers(data.users);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar los usuarios.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

  async function updateUser(user: AdminUser, updates: UpdateFields) {
    setBusyUserId(user.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "No fue posible actualizar el usuario.",
        );
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                role: data.user.role,
                enabled: data.user.enabled,
              }
            : currentUser,
        ),
      );

      setFeedback({
        userId: user.id,
        message: data.message || "Usuario actualizado correctamente.",
        success: true,
      });
    } catch (error) {
      setFeedback({
        userId: user.id,
        message:
          error instanceof Error
            ? error.message
            : "Ocurrió un error al actualizar el usuario.",
        success: false,
      });
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#e8e5dd] bg-white p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Gestión de usuarios</h2>

        <p className="mt-1 text-sm text-[#73766f]">
          Consulta y administra los usuarios registrados en la aplicación.
        </p>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-[#73766f]">
          Cargando usuarios...
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      ) : users.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#73766f]">
          No hay usuarios registrados.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-[#73766f]">
            Total de usuarios: {users.length}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e8e5dd] text-[#73766f]">
                  <th className="px-3 py-3 font-medium">Nombre</th>
                  <th className="px-3 py-3 font-medium">Correo</th>
                  <th className="px-3 py-3 font-medium">Rol</th>
                  <th className="px-3 py-3 font-medium">Estado</th>
                  <th className="px-3 py-3 font-medium">Conversaciones</th>
                  <th className="px-3 py-3 font-medium">Registro</th>
                  <th className="px-3 py-3 font-medium">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const isBusy = busyUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[#f0eee8] last:border-0"
                    >
                      <td className="px-3 py-4 font-medium">{user.fullName}</td>

                      <td className="px-3 py-4 text-[#73766f]">
                        {user.email ?? "No disponible"}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            user.role === "ADMIN"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-[#edf4ee] text-[#39765a]"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            user.enabled
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {user.enabled ? "Habilitado" : "Deshabilitado"}
                        </span>
                      </td>

                      <td className="px-3 py-4 text-center">
                        {user.conversationsCount}
                      </td>

                      <td className="px-3 py-4 text-[#73766f]">
                        {new Date(user.createdAt).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex flex-col items-start gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              updateUser(user, {
                                role: user.role === "ADMIN" ? "USER" : "ADMIN",
                              })
                            }
                            className="rounded-lg border border-[#e8e5dd] px-3 py-1.5 text-xs font-medium transition hover:bg-[#f5f4f0] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy
                              ? "Actualizando..."
                              : user.role === "ADMIN"
                                ? "Cambiar a USER"
                                : "Cambiar a ADMIN"}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              updateUser(user, {
                                enabled: !user.enabled,
                              })
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              user.enabled
                                ? "bg-red-50 text-red-700 hover:bg-red-100"
                                : "bg-green-50 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {isBusy
                              ? "Actualizando..."
                              : user.enabled
                                ? "Deshabilitar"
                                : "Habilitar"}
                          </button>

                          {feedback?.userId === user.id && (
                            <p
                              role="status"
                              className={`max-w-52 text-xs ${
                                feedback.success
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              {feedback.message}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
