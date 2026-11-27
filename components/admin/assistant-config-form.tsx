"use client";

import { useEffect, useState } from "react";

type AssistantConfig = {
  id: number;
  name: string;
  description: string;
  specialty: string;
  system_prompt: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export default function AssistantConfigForm() {
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch("/api/admin/assistant-config", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "No fue posible cargar la configuración.",
          );
        }

        setConfig(data.config);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error al cargar la configuración.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  function handleChange(field: keyof AssistantConfig, value: string | boolean) {
    setConfig((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!config) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/assistant-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: config.name,
          description: config.description,
          specialty: config.specialty,
          system_prompt: config.system_prompt,
          enabled: config.enabled,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "No fue posible guardar la configuración.",
        );
      }

      setConfig(data.config);
      setMessage(data.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al guardar la configuración.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-[#e8e5dd] bg-white p-6">
        <p className="text-sm text-[#73766f]">
          Cargando configuración del asistente...
        </p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="mt-8 rounded-2xl border border-red-200 bg-white p-6">
        <p className="text-sm text-red-600">
          {error || "No se pudo cargar la configuración."}
        </p>
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#e8e5dd] bg-white p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Configuración del asistente</h2>

        <p className="mt-1 text-sm text-[#73766f]">
          Administra la identidad, especialidad, instrucciones y disponibilidad
          del asistente de inteligencia artificial.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="assistant-name"
            className="mb-2 block text-sm font-medium"
          >
            Nombre del asistente
          </label>

          <input
            id="assistant-name"
            type="text"
            maxLength={100}
            required
            value={config.name}
            onChange={(event) => handleChange("name", event.target.value)}
            className="w-full rounded-xl border border-[#e8e5dd] px-4 py-3 text-sm outline-none transition focus:border-[#39765a]"
          />
          <p className="mt-1 text-xs text-[#73766f]">Máximo 100 caracteres.</p>
        </div>

        <div>
          <label
            htmlFor="assistant-description"
            className="mb-2 block text-sm font-medium"
          >
            Descripción
          </label>

          <textarea
            id="assistant-description"
            maxLength={500}
            required
            rows={3}
            value={config.description}
            onChange={(event) =>
              handleChange("description", event.target.value)
            }
            className="w-full resize-y rounded-xl border border-[#e8e5dd] px-4 py-3 text-sm outline-none transition focus:border-[#39765a]"
          />
          <p className="mt-1 text-xs text-[#73766f]">Máximo 500 caracteres.</p>
        </div>

        <div>
          <label
            htmlFor="assistant-specialty"
            className="mb-2 block text-sm font-medium"
          >
            Especialidad
          </label>

          <input
            id="assistant-specialty"
            type="text"
            maxLength={150}
            required
            value={config.specialty}
            onChange={(event) => handleChange("specialty", event.target.value)}
            className="w-full rounded-xl border border-[#e8e5dd] px-4 py-3 text-sm outline-none transition focus:border-[#39765a]"
          />
          <p className="mt-1 text-xs text-[#73766f]">Máximo 150 caracteres.</p>
        </div>

        <div>
          <label
            htmlFor="assistant-system-prompt"
            className="mb-2 block text-sm font-medium"
          >
            System Prompt
          </label>

          <textarea
            id="assistant-system-prompt"
            required
            rows={16}
            value={config.system_prompt}
            onChange={(event) =>
              handleChange("system_prompt", event.target.value)
            }
            className="w-full resize-y rounded-xl border border-[#e8e5dd] px-4 py-3 font-mono text-sm leading-6 outline-none transition focus:border-[#39765a]"
          />

          <p className="mt-1 text-xs text-[#73766f]">
            Define el comportamiento, conocimientos y restricciones del
            asistente.
          </p>
        </div>

        <div className="rounded-xl border border-[#e8e5dd] p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <div>
              <span className="block text-sm font-medium">
                Disponibilidad del asistente
              </span>

              <span className="mt-1 block text-xs text-[#73766f]">
                {config.enabled
                  ? "El asistente está habilitado y puede responder consultas."
                  : "El asistente está deshabilitado y no puede responder consultas."}
              </span>
            </div>

            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) =>
                handleChange("enabled", event.target.checked)
              }
              className="h-5 w-5 accent-[#39765a]"
            />
          </label>
        </div>

        {message && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#39765a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2f624a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      </form>
    </section>
  );
}
