"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const successMessage =
    searchParams.get("verified") === "1"
      ? "Tu correo electrónico fue confirmado. Ya puedes iniciar sesión."
      : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    const formData = new FormData(event.currentTarget);

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setErrorMessage("Ingresa tu correo electrónico y contraseña.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(
          "No fue posible iniciar sesión. Verifica tu correo y contraseña, y asegúrate de haber confirmado tu correo electrónico."
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage(
        "Ocurrió un problema al iniciar sesión. Inténtalo nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#faf9f6] text-[#202820]">
      {/* Encabezado */}
      <header className="flex items-center justify-between border-b border-[#e8e5dd] px-6 py-4 md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173f35] text-xl">
            👨‍🍳
          </div>

          <span className="text-lg font-bold tracking-tight">
            AI Expert Chat
          </span>
        </Link>

        <Link
          href="/"
          className="text-sm font-medium text-[#73766f] transition hover:text-[#173f35]"
        >
          Volver al inicio
        </Link>
      </header>

      {/* Formulario */}
      <section className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-[#e8e5dd] bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#edf4ed] text-2xl">
              👨‍🍳
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              ¡Bienvenido de nuevo!
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#73766f]">
              Inicia sesión para continuar explorando el mundo de la gastronomía.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold"
              >
                Correo electrónico
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="ejemplo@correo.com"
                autoComplete="email"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-[#e8e5dd] bg-[#faf9f6] px-4 py-3 text-sm outline-none transition placeholder:text-[#a5a59e] focus:border-[#39765a] focus:ring-2 focus:ring-[#39765a]/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold"
              >
                Contraseña
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
                disabled={isLoading}
                className="w-full rounded-xl border border-[#e8e5dd] bg-[#faf9f6] px-4 py-3 text-sm outline-none transition placeholder:text-[#a5a59e] focus:border-[#39765a] focus:ring-2 focus:ring-[#39765a]/15 disabled:opacity-60"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800"
              >
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#173f35] px-5 py-3.5 font-semibold text-white transition hover:bg-[#245747] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#73766f]">
            ¿Todavía no tienes una cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#285b43] hover:underline"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </section>

      {/* Pie de página */}
      <footer className="border-t border-[#e8e5dd] px-6 py-6 text-center text-sm text-[#73766f]">
        AI Expert Chat · Tu compañero inteligente en la cocina.
      </footer>
    </main>
  );
}