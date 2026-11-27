
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);

    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(
      formData.get("confirmPassword") ?? ""
    );

    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMessage("Todos los campos son obligatorios.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        "Tu cuenta fue creada. Revisa tu correo electrónico y sigue el enlace de confirmación para activar tu cuenta."
      );
    } catch {
      setErrorMessage(
        "No fue posible completar el registro. Inténtalo nuevamente."
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
              Crea tu cuenta
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#73766f]">
              Regístrate y comienza a explorar el mundo de la gastronomía
              con inteligencia artificial.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-semibold"
              >
                Nombre completo
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Tu nombre completo"
                autoComplete="name"
                required
                maxLength={120}
                disabled={isLoading || !!successMessage}
                className="w-full rounded-xl border border-[#e8e5dd] bg-[#faf9f6] px-4 py-3 text-sm outline-none transition placeholder:text-[#a5a59e] focus:border-[#39765a] focus:ring-2 focus:ring-[#39765a]/15 disabled:opacity-60"
              />
            </div>

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
                disabled={isLoading || !!successMessage}
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
                placeholder="Crea una contraseña"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isLoading || !!successMessage}
                className="w-full rounded-xl border border-[#e8e5dd] bg-[#faf9f6] px-4 py-3 text-sm outline-none transition placeholder:text-[#a5a59e] focus:border-[#39765a] focus:ring-2 focus:ring-[#39765a]/15 disabled:opacity-60"
              />

              <p className="mt-2 text-xs text-[#73766f]">
                La contraseña debe tener al menos 8 caracteres.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold"
              >
                Confirmar contraseña
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isLoading || !!successMessage}
                className="w-full rounded-xl border border-[#e8e5dd] bg-[#faf9f6] px-4 py-3 text-sm outline-none transition placeholder:text-[#a5a59e] focus:border-[#39765a] focus:ring-2 focus:ring-[#39765a]/15 disabled:opacity-60"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
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
              disabled={isLoading || !!successMessage}
              className="w-full rounded-xl bg-[#173f35] px-5 py-3.5 font-semibold text-white transition hover:bg-[#245747] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#73766f]">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#285b43] hover:underline"
            >
              Inicia sesión
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
